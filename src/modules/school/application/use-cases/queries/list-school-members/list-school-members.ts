import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRoleRepository } from '../../../../domain/repositories/i-school-role.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { toSchoolMembershipOutput, toSchoolRoleSummary } from '../../school.output.js';
import type { ListSchoolMembersInput } from './list-school-members.input.js';
import type { ListSchoolMembersOutput } from './list-school-members.output.js';
import type { UUID } from 'node:crypto';

export class ListSchoolMembersUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly memberships: SchoolMembershipRepository,
    private readonly roles: SchoolRoleRepository,
    private readonly authorization: SchoolAuthorizationService,
    private readonly users: UserAccountService,
  ) {}

  async handle(input: ListSchoolMembersInput): Promise<ListSchoolMembersOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    const actions = await this.authorization.getPermissionsFor(
      { userId: input.performedBy },
      input.schoolId,
    );
    const full = actions.includes(SchoolAction.VIEW_MEMBER_DETAILS);
    if (!full && !actions.includes(SchoolAction.VIEW_MEMBERS)) {
      throw new SchoolMembershipActionForbiddenException();
    }

    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }

    const page = input.pagination?.page ?? 1;
    const limit = input.pagination?.limit ?? 20;
    if (!Number.isInteger(page) || page < 1) {
      throw new InvalidSchoolMembershipException('Page must be a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new InvalidSchoolMembershipException('Limit must be between 1 and 100');
    }
    if (input.roleId !== undefined && !input.roleId.trim()) {
      throw new InvalidSchoolMembershipException('Role ID cannot be empty');
    }
    if (input.search !== undefined && input.search.trim().length > 200) {
      throw new InvalidSchoolMembershipException('Search must not exceed 200 characters');
    }

    const statuses = full
      ? input.status
        ? [input.status]
        : Object.values(MembershipStatus).filter((status) => status !== MembershipStatus.REVOKED)
      : [MembershipStatus.ACTIVE];
    const result = await this.memberships.findBySchoolPaginated(
      input.schoolId,
      {
        statuses,
        roleId: input.roleId?.trim(),
        search: input.search?.trim() || undefined,
        includeEmailInSearch: full,
      },
      { page, limit },
    );
    const schoolRoles = await this.roles.findBySchool(input.schoolId);
    const rolesOf = (roleIds: readonly string[]) =>
      schoolRoles
        .filter((role) => roleIds.includes(role.id))
        .map(toSchoolRoleSummary);
    const profileOf = async (userId: string) => {
      const profile = await this.users.authenticationProfile(userId);
      return {
        email: profile?.email ?? null,
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
      };
    };

    if (!full) {
      // Reduced view: ACTIVE members only, whatever the requested status.
      return {
        view: 'reduced',
        items: await Promise.all(
          result.items.map(async (m) => {
            const { firstName, lastName } = await profileOf(m.userId);
            return {
              userId: m.userId,
              firstName,
              lastName,
              roles: rolesOf(m.roleIds),
            };
          }),
        ),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    }

    return {
      view: 'full',
      items: await Promise.all(
        result.items.map(async (m) => ({
          ...toSchoolMembershipOutput(m),
          roles: rolesOf(m.roleIds),
          ...(await profileOf(m.userId)),
        })),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
