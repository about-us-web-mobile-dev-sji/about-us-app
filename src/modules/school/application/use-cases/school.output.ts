import type { School } from '../../domain/entities/school.entity.js';
import type { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import type { MembershipRole } from '../../domain/enums/membership-role.enum.js';
import type { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import type { SchoolStatus } from '../../domain/enums/school-status.enum.js';

export interface SchoolOutput {
  id: string;
  name: string;
  address: string | null;
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
  role: MembershipRole;
  status: MembershipStatus;
  grantedBy: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
}

export function toSchoolOutput(school: School): SchoolOutput {
  const primitives = school.toPrimitives();
  return { ...primitives, id: primitives.id as string };
}

export function toSchoolMembershipOutput(
  membership: SchoolMembership,
): SchoolMembershipOutput {
  return membership.toPrimitives();
}