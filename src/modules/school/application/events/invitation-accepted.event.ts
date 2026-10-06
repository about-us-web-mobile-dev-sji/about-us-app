export class InvitationAcceptedEvent {
  constructor(
    public readonly inviterId: string,
    public readonly schoolId: string,
    public readonly schoolName: string,
    public readonly adminUserId: string,
    public readonly acceptedAt: Date,
  ) {}
}