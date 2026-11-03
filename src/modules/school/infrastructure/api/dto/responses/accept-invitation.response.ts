import type { AcceptSchoolInvitationOutput } from '../../../../application/use-cases/commands/accept-school-invitation/accept-school-invitation.output.js';
import type { UserSummaries } from '../../../../../user/application/user-directory.js';
import { SchoolResponse } from './school.response.js';
import { MembershipResponse } from './membership.response.js';

export class AcceptInvitationResponse {
  school!: SchoolResponse;
  membership!: MembershipResponse;

  static fromOutput(
    output: AcceptSchoolInvitationOutput,
    users: UserSummaries,
  ): AcceptInvitationResponse {
    return {
      school: SchoolResponse.fromOutput(output.school, users),
      membership: MembershipResponse.fromOutput(output.membership, users),
    };
  }

  static userIdsOf(output: AcceptSchoolInvitationOutput): (string | null)[] {
    return [output.school.createdBy, ...MembershipResponse.userIdsOf(output.membership)];
  }
}
