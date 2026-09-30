import type { SchoolMembershipOutput } from '../../school.output.js';

export interface ChangeSchoolMemberRoleOutput {
  membership: SchoolMembershipOutput;
  previousRole: string;
}
