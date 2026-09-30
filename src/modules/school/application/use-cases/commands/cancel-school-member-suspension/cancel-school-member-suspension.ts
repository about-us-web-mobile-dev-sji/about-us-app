import type { CancelSchoolMemberSuspensionInput } from './cancel-school-member-suspension.input.js';
import type { CancelSchoolMemberSuspensionOutput } from './cancel-school-member-suspension.output.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { toSchoolMembershipOutput } from '../../school.output.js';

export class CancelSchoolMemberSuspensionUseCase {
  constructor(
    private readonly memberships: SchoolMembershipRepository,
    private readonly authorization: SchoolAuthorizationService,
  ) {}

  async handle(
    input: CancelSchoolMemberSuspensionInput,
  ): Promise<CancelSchoolMemberSuspensionOutput> {
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
    await this.authorization.assertCan(actor, SchoolAction.CANCEL_SUSPENSION, input.schoolId);
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

    if (!targetMembership) {
      throw new SchoolMembershipNotFoundException(
        input.schoolId,
        input.memberUserId,
      );
    }

    targetMembership.cancelSuspension();

    const saved = await this.memberships.save(targetMembership);

    return { membership: toSchoolMembershipOutput(saved) };
  }
}
