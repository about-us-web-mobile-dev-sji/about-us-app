import type { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';

export interface RevokeSchoolMemberPermissionInput {
  schoolId: string;
  memberUserId: string;
  action: string;
  performedBy: string;
  performedByGlobalRole: GlobalRole;
}
