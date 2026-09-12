export class SuperAdminCreatedEvent {
  constructor(
    public readonly subjectId: string,
    public readonly email: string,
  ) {}
}
