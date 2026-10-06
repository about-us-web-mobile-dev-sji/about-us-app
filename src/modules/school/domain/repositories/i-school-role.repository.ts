import type { SchoolRole } from '../entities/school-role.entity.js';
import type { SchoolRoleKey } from '../enums/school-role-key.enum.js';

export const SCHOOL_ROLE_REPOSITORY = Symbol('SCHOOL_ROLE_REPOSITORY');

export interface SchoolRoleRepository {
  ensurePermissionCatalogue(): Promise<void>;
  findById(id: string): Promise<SchoolRole | null>;
  findByIds(ids: string[]): Promise<SchoolRole[]>;
  findBySchool(schoolId: string): Promise<SchoolRole[]>;
  findByKey(schoolId: string, key: SchoolRoleKey): Promise<SchoolRole | null>;
  existsByName(schoolId: string, name: string, excludeId?: string): Promise<boolean>;
  save(role: SchoolRole): Promise<SchoolRole>;
  delete(id: string): Promise<void>;
}
