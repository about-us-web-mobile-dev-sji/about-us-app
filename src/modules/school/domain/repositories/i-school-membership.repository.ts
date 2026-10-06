import type { SchoolMembership } from '../entities/school-membership.entity.js';
import type { MembershipStatus } from '../enums/membership-status.enum.js';
import type { PaginatedResult, PaginationParams } from '../../../../shared/domain/pagination.js';

export const SCHOOL_MEMBERSHIP_REPOSITORY = Symbol('SCHOOL_MEMBERSHIP_REPOSITORY');

export interface SchoolMembershipFilters {
  statuses: readonly MembershipStatus[];
  roleId?: string;
  search?: string;
  includeEmailInSearch?: boolean;
}

export interface SchoolMembershipRepository {
  findById(id: string): Promise<SchoolMembership | null>;
  findBySchoolAndUser(schoolId: string, userId: string): Promise<SchoolMembership | null>;
  findBySchool(schoolId: string): Promise<SchoolMembership[]>;
  findBySchoolPaginated(
    schoolId: string,
    filters: SchoolMembershipFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<SchoolMembership>>;
  findActiveByUser(userId: string): Promise<SchoolMembership[]>;
  findByRole(roleId: string): Promise<SchoolMembership[]>;
  save(membership: SchoolMembership): Promise<SchoolMembership>;
}
