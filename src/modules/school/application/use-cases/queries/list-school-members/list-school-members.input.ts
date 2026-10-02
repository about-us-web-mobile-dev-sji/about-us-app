import type { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import type { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';

export interface ListSchoolMembersInput {
  schoolId: string;
  performedBy: string;
  performedByGlobalRole: GlobalRole;
  status?: MembershipStatus;
}
