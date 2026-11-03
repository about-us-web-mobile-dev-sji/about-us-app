import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolRole } from '../../../../domain/enums/school-role.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { toSchoolMembershipOutput } from '../../school.output.js';
import type { ListSchoolMembersInput } from './list-school-members.input.js';
import type { ListSchoolMembersOutput } from './list-school-members.output.js';
import type { UUID } from 'node:crypto';

export class ListSchoolMembersUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly memberships: SchoolMembershipRepository,
    private readonly authorization: SchoolAuthorizationService,
  ) {}

  async handle(input: ListSchoolMembersInput): Promise<ListSchoolMembersOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    // The administrator sees every member in detail; a member sees the
    // other active members only.
    const actor = { userId: input.performedBy };
    const full = await this.authorization.isSchoolAdmin(actor, input.schoolId);
    if (!full && !(await this.authorization.isActiveMember(actor, input.schoolId))) {
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
    if (input.role !== undefined && !Object.values(SchoolRole).includes(input.role)) {
      throw new InvalidSchoolMembershipException('Role must be ADMIN or MEMBER');
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
        role: input.role,
        search: input.search?.trim() || undefined,
        includeEmailInSearch: full,
      },
      { page, limit },
    );
    if (!full) {
      // Reduced view: ACTIVE members only, whatever the requested status.
      return {
        view: 'reduced',
        items: result.items.map((m) => ({ userId: m.userId, role: m.role })),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    }

    return {
      view: 'full',
      items: result.items.map(toSchoolMembershipOutput),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
