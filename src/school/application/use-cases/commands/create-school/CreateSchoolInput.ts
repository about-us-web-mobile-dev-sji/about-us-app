export class CreateSchoolInput {
  constructor(
    public readonly identifier: string,
    public readonly name: string,
    public readonly description: string,
    public readonly address: string,
    public readonly city: string,
    public readonly postalCode: string,
    public readonly country: string,
    public readonly mainAdministratorId: string | null,
    public readonly createdBy: string,
  ) {}
}
