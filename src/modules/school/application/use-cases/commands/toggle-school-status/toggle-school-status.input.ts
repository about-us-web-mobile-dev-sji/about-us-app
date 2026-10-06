import type { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';

export interface ToggleSchoolStatusInput {
  schoolId: string;
  status?: SchoolStatus;
}