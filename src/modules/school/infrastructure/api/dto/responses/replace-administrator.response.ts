import type { ReplaceSchoolAdministratorOutput } from '../../../../application/use-cases/commands/replace-school-administrator/replace-school-administrator.output.js';

// The use-case output is already the exact shape the API exposes, but it
// still goes through a Response DTO: a future change to the use-case output
// (e.g. an internal field) must not silently change the API contract.
export class ReplaceAdministratorResponse {
  schoolId!: string;
  previousAdminUserId!: string | null;
  newAdminUserId!: string;
  membershipRevoked!: boolean;
  newMembershipCreated!: boolean;

  static fromOutput(
    output: ReplaceSchoolAdministratorOutput,
  ): ReplaceAdministratorResponse {
    return { ...output };
  }
}
