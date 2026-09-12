export class ReplaceSchoolAdministratorInput {
  constructor(
    public readonly schoolId: string,
    public readonly newAdministratorId: string | null,
    public readonly newAdministratorEmail: string | null,
    public readonly replacedBy: string,
  ) {
    // Validate that either ID or email is provided, but not both
    if (!newAdministratorId && !newAdministratorEmail) {
      throw new Error('Either newAdministratorId or newAdministratorEmail must be provided');
    }
    if (newAdministratorId && newAdministratorEmail) {
      throw new Error('Provide either newAdministratorId or newAdministratorEmail, not both');
    }
  }
}
