import { MembershipStatus } from '../enums/membership-status.enum.js';
import type { SchoolAction } from '../enums/school-action.enum.js';

// Effective permissions of a member: union of the permissions of its roles,
// and only while the membership is ACTIVE.
export function effectiveSchoolActions(
  status: MembershipStatus,
  roles: ReadonlyArray<{ permissions: readonly SchoolAction[] }>,
): SchoolAction[] {
  if (status !== MembershipStatus.ACTIVE) {
    return [];
  }
  return [...new Set(roles.flatMap((role) => role.permissions))];
}
