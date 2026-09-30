import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { toSchoolMembershipOutput } from '../../school.output.js';
import type { GetSchoolMemberPermissionsInput } from './get-school-member-permissions.input.js';
import type { GetSchoolMemberPermissionsOutput } from './get-school-member-permissions.output.js';

export class GetSchoolMemberPermissionsUseCase {
  constructor(
    private readonly memberships: SchoolMembershipRepository,
    private readonly authorization: SchoolAuthorizationService,
  ) {}

  async handle(
    input: GetSchoolMemberPermissionsInput,
  ): Promise<GetSchoolMemberPermissionsOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.memberUserId?.trim()) {
      throw new InvalidSchoolMembershipException('Member user ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    await this.authorization.assertCan(
      { userId: input.performedBy, globalRole: input.performedByGlobalRole },
      SchoolAction.MANAGE_MEMBER_PERMISSIONS,
      input.schoolId,
    );

    const target = await this.memberships.findBySchoolAndUser(
      input.schoolId,
      input.memberUserId,
    );
    if (!target) {
      throw new SchoolMembershipNotFoundException(
        input.schoolId,
        input.memberUserId,
      );
    }
    return { membership: toSchoolMembershipOutput(target) };
  }
}
