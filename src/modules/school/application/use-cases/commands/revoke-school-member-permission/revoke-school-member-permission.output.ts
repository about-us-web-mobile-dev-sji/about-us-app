import type { SchoolMembershipOutput } from '../../school.output.js';

export interface RevokeSchoolMemberPermissionOutput {
  membership: SchoolMembershipOutput;
  changed: boolean;
}
