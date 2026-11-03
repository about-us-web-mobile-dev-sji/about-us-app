import type { ReplaceSchoolAdministratorOutput } from '../../../../application/use-cases/commands/replace-school-administrator/replace-school-administrator.output.js';
import { summaryOf, type UserSummaries, type UserSummary } from '../../../../../user/application/user-directory.js';

// Goes through a Response DTO so that a change to the use-case output
// (e.g. an internal field) does not silently change the API contract.
export class ReplaceAdministratorResponse {
  schoolId!: string;
  previousAdmin!: UserSummary | null;
  newAdmin!: UserSummary;
  membershipRevoked!: boolean;
  newMembershipCreated!: boolean;

  static fromOutput(
    output: ReplaceSchoolAdministratorOutput,
    users: UserSummaries,
  ): ReplaceAdministratorResponse {
    return {
      schoolId: output.schoolId,
      previousAdmin: summaryOf(users, output.previousAdminUserId),
      newAdmin: summaryOf(users, output.newAdminUserId),
      membershipRevoked: output.membershipRevoked,
      newMembershipCreated: output.newMembershipCreated,
    };
  }
}
