import type { SchoolAction } from '../../../../domain/enums/school-action.enum.js';

export interface CreateSchoolRoleInput {
  schoolId: string;
  name: string;
  description?: string;
  permissions?: SchoolAction[];
  performedBy: string;
}
