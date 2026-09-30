import { randomUUID } from 'node:crypto';

// Emitted as 'school.member-role.changed'. `eventId`, `schoolId`, `schoolName`
// and `recipientIds` keep the shape already consumed by the notification
// listener; the other fields feed the event log.
export class SchoolMemberRoleChangedEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();
  readonly recipientIds: string[];

  constructor(
    public readonly schoolId: string,
    public readonly schoolName: string,
    public readonly memberUserId: string,
    public readonly previousRole: string,
    public readonly newRole: string,
    public readonly changedBy: string,
  ) {
    this.recipientIds = [memberUserId];
  }
}
