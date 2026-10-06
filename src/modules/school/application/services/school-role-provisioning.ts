import { SchoolRole } from '../../domain/entities/school-role.entity.js';
import { SchoolRoleKey } from '../../domain/enums/school-role-key.enum.js';
import type { SchoolRoleRepository } from '../../domain/repositories/i-school-role.repository.js';

export type SystemRoles = Record<SchoolRoleKey, SchoolRole>;

export async function ensureSystemRoles(
  roles: SchoolRoleRepository,
  schoolId: string,
): Promise<SystemRoles> {
  await roles.ensurePermissionCatalogue();
  const result = {} as SystemRoles;
  for (const key of Object.values(SchoolRoleKey)) {
    result[key] =
      (await roles.findByKey(schoolId, key)) ??
      (await roles.save(SchoolRole.createSystem(schoolId, key)));
  }
  return result;
}
