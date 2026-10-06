import type { SchoolAction } from '../../../../domain/enums/school-action.enum.js';

export interface UpdateSchoolRoleInput {
  schoolId: string;
  roleId: string;
  name?: string;
  description?: string | null;
  permissions?: SchoolAction[];
  performedBy: string;
}
