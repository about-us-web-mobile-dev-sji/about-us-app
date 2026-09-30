import type { SchoolMembershipOutput } from '../../school.output.js';

export interface GrantSchoolMemberPermissionOutput {
  membership: SchoolMembershipOutput;
  changed: boolean;
}
