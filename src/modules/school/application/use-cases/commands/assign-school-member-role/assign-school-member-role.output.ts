import type { SchoolMembershipOutput } from '../../school.output.js';

export interface AssignSchoolMemberRoleOutput {
  membership: SchoolMembershipOutput;
  // false when the call changed nothing (role already held / not held).
  changed: boolean;
}
