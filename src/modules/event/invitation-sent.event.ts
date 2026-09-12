export class InvitationSentEvent {
  constructor(
    public readonly email: string,
    public readonly schoolId: string,
    public readonly schoolName: string,
    public readonly sentAt: Date,
  ) {}
}