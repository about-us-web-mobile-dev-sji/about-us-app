import type { AcceptSchoolInvitationOutput } from '../../../../application/use-cases/commands/accept-school-invitation/accept-school-invitation.output.js';
import { SchoolResponse } from './school.response.js';
import { MembershipResponse } from './membership.response.js';

export class AcceptInvitationResponse {
  school!: SchoolResponse;
  membership!: MembershipResponse;

  static fromOutput(
    output: AcceptSchoolInvitationOutput,
  ): AcceptInvitationResponse {
    return {
      school: SchoolResponse.fromOutput(output.school),
      membership: MembershipResponse.fromOutput(output.membership),
    };
  }
}
