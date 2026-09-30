import type { SchoolMembershipOutput, SchoolOutput } from '../../school.output.js';

export interface AcceptSchoolInvitationOutput {
  school: SchoolOutput;
  membership: SchoolMembershipOutput;
}
