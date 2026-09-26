import type { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';

export interface RevokeSchoolMemberInput {
  schoolId: string;
  memberUserId: string;
  performedBy: string;
  performedByGlobalRole: GlobalRole;
}
