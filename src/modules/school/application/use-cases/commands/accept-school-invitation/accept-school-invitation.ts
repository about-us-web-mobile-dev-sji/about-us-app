import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationAcceptedEvent } from '../../../../infrastructure/events/invitation-accepted.event.js';
import { SchoolInvitation } from '../../../../domain/entities/school-invitation.entity.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { SchoolAdministratorAlreadyAssignedException } from '../../../../domain/exceptions/school-administrator-already-assigned.exception.js';
import { SchoolInvitationInvalidException } from '../../../../domain/exceptions/school-invitation-invalid.exception.js';
import { SchoolInvitationMismatchException } from '../../../../domain/exceptions/school-invitation-mismatch.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolInvitationRepository } from '../../../../domain/repositories/i-school-invitation.repository.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';
import type { AcceptSchoolInvitationInput } from './accept-school-invitation.input.js';
import type { AcceptSchoolInvitationOutput } from './accept-school-invitation.output.js';
import type { UUID } from 'node:crypto';
import { toSchoolMembershipOutput, toSchoolOutput } from '../../school.output.js';

export class AcceptSchoolInvitation {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly invitations: SchoolInvitationRepository,
    private readonly memberships: SchoolMembershipRepository,
    private readonly users: UserAccountService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(
    input: AcceptSchoolInvitationInput,
  ): Promise<AcceptSchoolInvitationOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolException('School id is required');
    }
    if (!input.token?.trim()) {
      throw new InvalidSchoolException('Invitation token is required');
    }
    if (!input.userId?.trim()) {
      throw new InvalidSchoolException('userId is required');
    }

    const invitation = await this.invitations.findByTokenHash(
      SchoolInvitation.hashToken(input.token.trim()),
    );
    if (!invitation || invitation.schoolId !== input.schoolId) {
      throw new SchoolInvitationInvalidException();
    }
    invitation.ensureAcceptable();

    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }
    if (school.status === SchoolStatus.BLOCKED) {
      throw new InvalidSchoolException(
        'School is blocked, invitation cannot be accepted',
      );
    }
    const accepter = await this.users.authenticationProfile(input.userId);
    if (
      !accepter ||
      accepter.email.trim().toLowerCase() !== invitation.email.toLowerCase()
    ) {
      throw new SchoolInvitationMismatchException();
    }

    const schoolMemberships = await this.memberships.findBySchool(
      input.schoolId,
    );
    if (invitation.role === MembershipRole.SCHOOL_ADMIN) {
      const otherAdmin = schoolMemberships.find(
        (m) =>
          m.role === MembershipRole.SCHOOL_ADMIN &&
          m.status !== MembershipStatus.REVOKED &&
          m.userId !== input.userId,
      );
      if (otherAdmin) {
        throw new SchoolAdministratorAlreadyAssignedException();
      }
    }

    let membership = schoolMemberships.find((m) => m.userId === input.userId);
    if (membership) {
      if (membership.status === MembershipStatus.REVOKED) {
        throw new SchoolMembershipActionForbiddenException(
          'Your membership to this school has been revoked',
        );
      }
      if (invitation.role === MembershipRole.SCHOOL_ADMIN) {
        membership.changeRole(MembershipRole.SCHOOL_ADMIN);
        membership.activate();
      } else {
        if (membership.status === MembershipStatus.SUSPENDED) {
          throw new SchoolMembershipActionForbiddenException(
            'Your membership to this school is suspended',
          );
        }
        membership.activate();
      }
    } else {
      membership = SchoolMembership.create({
        schoolId: input.schoolId,
        userId: input.userId,
        role: invitation.role,
        grantedBy: invitation.invitedBy,
      });
    }
    const savedMembership = await this.memberships.save(membership);

    invitation.accept(input.userId);
    await this.invitations.save(invitation);

    this.eventEmitter.emit(
      'invitation.accepted',
      new InvitationAcceptedEvent(
        invitation.invitedBy,
        input.schoolId,
        school.name,
        input.userId,
        new Date(),
      ),
    );

    return {
      school: toSchoolOutput(school),
      membership: toSchoolMembershipOutput(savedMembership),
    };
  }
}
