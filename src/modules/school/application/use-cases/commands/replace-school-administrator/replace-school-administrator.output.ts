export interface ReplaceSchoolAdministratorOutput {
  schoolId: string;
  previousAdminUserId: string | null;
  newAdminUserId: string;
  membershipRevoked: boolean;
  newMembershipCreated: boolean;
}
