export class ReplaceSchoolAdministratorOutput {
  constructor(
    public readonly schoolId: string,
    public readonly previousAdministratorId: string | null,
    public readonly newAdministratorId: string | null,
    public readonly invitationSent: boolean,
    public readonly replacedAt: Date,
  ) {}
}
