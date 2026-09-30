import type { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import type { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';

export interface ChangeSchoolMemberRoleInput {
  schoolId: string;
  memberUserId: string;
  newRole: MembershipRole;
  performedBy: string;
  performedByGlobalRole: GlobalRole;
}
