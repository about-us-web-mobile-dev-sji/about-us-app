import type { SuspendSchoolMemberInput } from './SuspendSchoolMemberInput.js';
import type { SuspendSchoolMemberOutput } from './suspend-school-member.output.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';

export class SuspendSchoolMemberUseCase {
  constructor(private readonly memberships: SchoolMembershipRepository) {}

  async handle(input: SuspendSchoolMemberInput): Promise<SuspendSchoolMemberOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.memberUserId?.trim()) {
      throw new InvalidSchoolMembershipException('Member user ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    const performerMembership = await this.memberships.findBySchoolAndUser(
      input.schoolId,
      input.performedBy,
    );

    if (
      !performerMembership ||
      performerMembership.role !== MembershipRole.SCHOOL_ADMIN ||
      performerMembership.status !== MembershipStatus.ACTIVE
    ) {
      throw new SchoolMembershipActionForbiddenException();
    }

    if (input.memberUserId === input.performedBy) {
      throw new InvalidSchoolMembershipException(
        'An administrator cannot suspend themselves',
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

    targetMembership.suspend();

    const saved = await this.memberships.save(targetMembership);

    return { membership: saved };
  }
}
