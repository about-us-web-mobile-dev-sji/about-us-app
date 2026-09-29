import type { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import type { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';

export interface InviteSchoolMemberInput {
  schoolId: string;
  email: string;
  role?: MembershipRole;
  performedBy: string;
  performedByGlobalRole: GlobalRole;
}
