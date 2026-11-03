import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationSentEvent } from '../../../events/invitation-sent.event.js';
import { SchoolInvitation } from '../../../../domain/entities/school-invitation.entity.js';
import { SchoolRole } from '../../../../domain/enums/school-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import type { SchoolInvitationRepository } from '../../../../domain/repositories/i-school-invitation.repository.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';
import type { InviteSchoolMemberInput } from './invite-school-member.input.js';
import type { InviteSchoolMemberOutput } from './invite-school-member.output.js';
import type { UUID } from 'node:crypto';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class InviteSchoolMemberUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly invitations: SchoolInvitationRepository,
    private readonly memberships: SchoolMembershipRepository,
    private readonly users: UserAccountService,
    private readonly eventEmitter: EventEmitter2,
    private readonly authorization: SchoolAuthorizationService,
  ) {}

  async handle(
    input: InviteSchoolMemberInput,
  ): Promise<InviteSchoolMemberOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolException('School id is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }
    const email = input.email?.trim().toLowerCase();
    if (!email || !EMAIL_PATTERN.test(email)) {
      throw new InvalidSchoolMembershipException(
        'A valid invitation email is required',
      );
    }
    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }
    if (school.status === SchoolStatus.BLOCKED) {
      throw new InvalidSchoolException(
        'School is blocked, no one can be invited',
      );
    }

    await this.authorization.assertSchoolAdmin(
      { userId: input.performedBy, platformAdmin: input.platformAdmin },
      input.schoolId,
    );

    const schoolMemberships = await this.memberships.findBySchool(
      input.schoolId,
    );

    // Refuse people who already are, or can no longer be, members.
    const invitee = await this.users.notificationRecipientByEmail(email);
    const existing = invitee
      ? schoolMemberships.find((m) => m.userId === invitee.id)
      : undefined;
    if (existing) {
      if (existing.status === MembershipStatus.REVOKED) {
        throw new SchoolMembershipActionForbiddenException(
          'This user has been revoked from this school and cannot be invited again',
        );
      }
      if (existing.status === MembershipStatus.SUSPENDED) {
        throw new InvalidSchoolMembershipException(
          'This user is suspended in this school; cancel the suspension instead',
        );
      }
      if (existing.status === MembershipStatus.ACTIVE) {
        throw new InvalidSchoolMembershipException(
          'This user is already a member of this school',
        );
      }
    }

    const { invitation, token } = SchoolInvitation.issue({
      schoolId: input.schoolId,
      email,
      // An invitation always makes a member: the administrator is only
      // appointed at the school's creation or through the replacement.
      role: SchoolRole.MEMBER,
      invitedBy: input.performedBy,
    });
    const saved = await this.invitations.save(invitation);

    // Inviting again is how an invitation is resent: earlier pending ones for
    // the same address are cancelled so only the newest token works.
    const previous = await this.invitations.findPendingBySchoolAndEmail(
      input.schoolId,
      email,
    );
    for (const old of previous) {
      if (old.id !== saved.id) {
        old.cancel();
        await this.invitations.save(old);
      }
    }

    this.eventEmitter.emit(
      'invitation.sent',
      new InvitationSentEvent(
        email,
        input.schoolId,
        school.name,
        new Date(),
        token,
      ),
    );

    const primitives = saved.toPrimitives();
    return {
      invitation: {
        id: primitives.id,
        schoolId: primitives.schoolId,
        email: primitives.email,
        role: primitives.role,
        status: primitives.status,
        expiresAt: primitives.expiresAt,
      },
    };
  }
}
