import type { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import type { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import type { SchoolAction } from '../../../../domain/enums/school-action.enum.js';

export interface GetMySchoolPermissionsOutput {
  // null for a super admin who holds no membership in this school.
  role: MembershipRole | null;
  status: MembershipStatus | null;
  actions: SchoolAction[];
}
