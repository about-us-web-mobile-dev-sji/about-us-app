import type { School } from '../../domain/entities/school.entity.js';
import type { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import type { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import type { SchoolStatus } from '../../domain/enums/school-status.enum.js';
import type { SchoolRole } from '../../domain/entities/school-role.entity.js';

export interface SchoolOutput {
  id: string;
  name: string;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  status: SchoolStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SchoolMembershipOutput {
  id: string;
  schoolId: string;
  userId: string;
  status: MembershipStatus;
  grantedBy: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
  roleIds: string[];
}

export interface SchoolRoleOutput {
  id: string;
  schoolId: string;
  key: string | null;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchoolRoleSummary {
  id: string;
  key: string | null;
  name: string;
}

export function toSchoolRoleSummary(role: SchoolRole): SchoolRoleSummary {
  return { id: role.id, key: role.key, name: role.name };
}

export function toSchoolOutput(school: School): SchoolOutput {
  const primitives = school.toPrimitives();
  return { ...primitives, id: primitives.id as string };
}

export function toSchoolMembershipOutput(
  membership: SchoolMembership,
): SchoolMembershipOutput {
  const primitives = membership.toPrimitives();
  return { ...primitives, roleIds: [...membership.roleIds] };
}

export function toSchoolRoleOutput(role: SchoolRole): SchoolRoleOutput {
  return {
    id: role.id,
    schoolId: role.schoolId,
    key: role.key,
    name: role.name,
    description: role.description,
    permissions: [...role.permissions],
    isSystem: role.isSystem,
    createdAt: role.toPrimitives().createdAt,
    updatedAt: role.toPrimitives().updatedAt,
  };
}