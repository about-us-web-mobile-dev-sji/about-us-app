import { GlobalRole } from "../../../../../user/domain/enum/global-role.enum.js";

export interface CancelSchoolMemberSuspensionInput {
  schoolId: string;
  memberUserId: string;
  performedBy: string;
  performedByGlobalRole: GlobalRole;
}
