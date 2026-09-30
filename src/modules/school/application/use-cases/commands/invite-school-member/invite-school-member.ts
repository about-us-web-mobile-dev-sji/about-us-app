import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationSentEvent } from '../../../../infrastructure/events/invitation-sent.event.js';
import { SchoolInvitation } from '../../../../domain/entities/school-invitation.entity.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolAdministratorAlreadyAssignedException } from '../../../../domain/exceptions/school-administrator-already-assigned.exception.js';
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
    const role = input.role ?? MembershipRole.SCHOOL_MEMBER;

    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }
    if (school.status === SchoolStatus.BLOCKED) {
      throw new InvalidSchoolException(
        'School is blocked, no one can be invited',
      );
    }

    await this.authorization.assertCan(
      { userId: input.performedBy, globalRole: input.performedByGlobalRole },
      role === MembershipRole.SCHOOL_ADMIN
        ? SchoolAction.INVITE_ADMIN
        : SchoolAction.INVITE_MEMBER,
      input.schoolId,
    );

    const schoolMemberships = await this.memberships.findBySchool(
      input.schoolId,
    );

    // Only one administrator per school.
    if (role === MembershipRole.SCHOOL_ADMIN) {
      const hasAdmin = schoolMemberships.some(
        (m) =>
          m.role === MembershipRole.SCHOOL_ADMIN &&
          m.status !== MembershipStatus.REVOKED,
      );
      if (hasAdmin) {
        throw new SchoolAdministratorAlreadyAssignedException();
      }
    }

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
      if (role === MembershipRole.SCHOOL_MEMBER) {
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
    }

    const { invitation, token } = SchoolInvitation.issue({
      schoolId: input.schoolId,
      email,
      role,
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
