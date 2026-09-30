import type { SuspendSchoolMemberInput } from './suspend-school-member.input.js';
import type { SuspendSchoolMemberOutput } from './suspend-school-member.output.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { toSchoolMembershipOutput } from '../../school.output.js';

export class SuspendSchoolMemberUseCase {
  constructor(
    private readonly memberships: SchoolMembershipRepository,
    private readonly authorization: SchoolAuthorizationService,
  ) {}

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

    const actor = {
      userId: input.performedBy,
      globalRole: input.performedByGlobalRole,
    };
    await this.authorization.assertCan(actor, SchoolAction.SUSPEND_MEMBER, input.schoolId);
    await this.authorization.assertSchoolWritable(actor, input.schoolId);

    const targetMembership = await this.memberships.findBySchoolAndUser(
      input.schoolId,
      input.memberUserId,
    );
    await this.authorization.assertCanManageTarget(
      actor,
      input.schoolId,
      input.memberUserId,
      targetMembership,
    );

    if (input.memberUserId === input.performedBy) {
      throw new InvalidSchoolMembershipException(
        'An administrator cannot suspend themselves',
      );
    }

    if (!targetMembership) {
      throw new SchoolMembershipNotFoundException(
        input.schoolId,
        input.memberUserId,
      );
    }

    targetMembership.suspend();

    const saved = await this.memberships.save(targetMembership);

    return { membership: toSchoolMembershipOutput(saved) };
  }
}
