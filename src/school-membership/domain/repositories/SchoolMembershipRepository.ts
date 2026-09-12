import { SchoolMembership } from '../entities/SchoolMembership.js';

export interface SchoolMembershipRepository {
  save(membership: SchoolMembership): Promise<SchoolMembership>;
  findById(id: string): Promise<SchoolMembership | null>;
  findByUserIdAndSchoolId(userId: string, schoolId: string): Promise<SchoolMembership | null>;
  findPrimaryAdministratorBySchoolId(schoolId: string): Promise<SchoolMembership | null>;
  findBySchoolId(schoolId: string): Promise<SchoolMembership[]>;
  findByUserId(userId: string): Promise<SchoolMembership[]>;
  delete(id: string): Promise<void>;
}
