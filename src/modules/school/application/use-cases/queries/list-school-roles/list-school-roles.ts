import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { InvalidSchoolRoleException } from '../../../../domain/exceptions/invalid-school-role.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRoleRepository } from '../../../../domain/repositories/i-school-role.repository.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { toSchoolRoleOutput } from '../../school.output.js';
import type { ListSchoolRolesInput } from './list-school-roles.input.js';
import type { ListSchoolRolesOutput } from './list-school-roles.output.js';

export class ListSchoolRolesUseCase {
  constructor(
    private readonly roles: SchoolRoleRepository,
    private readonly memberships: SchoolMembershipRepository,
    private readonly authorization: SchoolAuthorizationService,
  ) {}

  async handle(input: ListSchoolRolesInput): Promise<ListSchoolRolesOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolRoleException('School ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolRoleException('PerformedBy is required');
    }

    // Who assigns roles, or attaches documents to them, needs to see them as
    // much as who manages them.
    await this.authorization.assertCanAny(
      { userId: input.performedBy },
      [SchoolAction.MANAGE_ROLES, SchoolAction.ASSIGN_ROLES, SchoolAction.SHARE_DOCUMENTS],
      input.schoolId,
    );

    const [roles, memberships] = await Promise.all([
      this.roles.findBySchool(input.schoolId),
      this.memberships.findBySchool(input.schoolId),
    ]);
    const live = memberships.filter((m) => m.status !== MembershipStatus.REVOKED);

    return {
      roles: roles.map((role) => ({
        ...toSchoolRoleOutput(role),
        membersCount: live.filter((m) => m.hasRole(role.id)).length,
      })),
    };
  }
}
