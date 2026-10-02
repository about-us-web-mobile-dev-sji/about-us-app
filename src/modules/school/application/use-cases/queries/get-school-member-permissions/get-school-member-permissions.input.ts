import type { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';

export interface GetSchoolMemberPermissionsInput {
  schoolId: string;
  memberUserId: string;
  performedBy: string;
  performedByGlobalRole: GlobalRole;
}
