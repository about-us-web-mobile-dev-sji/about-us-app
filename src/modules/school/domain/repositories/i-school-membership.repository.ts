import type { SchoolMembership } from '../entities/school-membership.entity.js';

export const SCHOOL_MEMBERSHIP_REPOSITORY = Symbol('SCHOOL_MEMBERSHIP_REPOSITORY');

export interface SchoolMembershipRepository {
  findById(id: string): Promise<SchoolMembership | null>;
  findBySchoolAndUser(schoolId: string, userId: string): Promise<SchoolMembership | null>;
  findActiveAdminBySchool(schoolId: string): Promise<SchoolMembership | null>;
  findBySchool(schoolId: string): Promise<SchoolMembership[]>;
  save(membership: SchoolMembership): Promise<SchoolMembership>;
}
