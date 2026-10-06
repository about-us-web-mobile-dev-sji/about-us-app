import type { SchoolRoleOutput } from '../../school.output.js';

export interface SchoolRoleWithCountOutput extends SchoolRoleOutput {
  membersCount: number;
}

export interface ListSchoolRolesOutput {
  roles: SchoolRoleWithCountOutput[];
}
