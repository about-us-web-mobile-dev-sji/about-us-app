import type { RevokeSchoolMemberInput } from './revoke-school-member.input.js';
import type { RevokeSchoolMemberOutput } from './revoke-school-member.output.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { toSchoolMembershipOutput } from '../../school.output.js';

export class RevokeSchoolMemberUseCase {
  constructor(private readonly memberships: SchoolMembershipRepository) {}

  async handle(input: RevokeSchoolMemberInput): Promise<RevokeSchoolMemberOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.memberUserId?.trim()) {
      throw new InvalidSchoolMembershipException('Member user ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    const isSuperAdmin = input.performedByGlobalRole === GlobalRole.SUPER_ADMIN;

    const performerMembership = await this.memberships.findBySchoolAndUser(
      input.schoolId,
      input.performedBy,
    );

    const isActiveSchoolAdmin =
      !!performerMembership &&
      performerMembership.role === MembershipRole.SCHOOL_ADMIN &&
      performerMembership.status === MembershipStatus.ACTIVE;

    if (!isSuperAdmin && !isActiveSchoolAdmin) {
      throw new SchoolMembershipActionForbiddenException();
    }

    if (input.memberUserId === input.performedBy) {
      throw new InvalidSchoolMembershipException(
        'An administrator cannot revoke their own membership',
      );
    }

    const targetMembership = await this.memberships.findBySchoolAndUser(
      input.schoolId,
      input.memberUserId,
    );

    if (!targetMembership) {
      throw new SchoolMembershipNotFoundException(
        input.schoolId,
        input.memberUserId,
      );
    }

    if (targetMembership.role === MembershipRole.SCHOOL_ADMIN) {
      throw new SchoolMembershipActionForbiddenException(
        "The school administrator's membership cannot be revoked this way; replace the administrator instead",
      );
    }

    targetMembership.revoke(input.performedBy);

    const saved = await this.memberships.save(targetMembership);

    return { membership: toSchoolMembershipOutput(saved) };
  }
}
