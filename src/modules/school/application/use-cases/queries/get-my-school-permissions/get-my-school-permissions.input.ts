import type { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';

export interface GetMySchoolPermissionsInput {
  schoolId: string;
  performedBy: string;
  performedByGlobalRole: GlobalRole;
}
