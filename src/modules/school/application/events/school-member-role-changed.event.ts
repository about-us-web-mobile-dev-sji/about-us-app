import { randomUUID } from 'node:crypto';

export type SchoolMemberRoleChange = 'ASSIGNED' | 'REMOVED';

export class SchoolMemberRoleChangedEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();
  readonly recipientIds: string[];

  constructor(
    public readonly schoolId: string,
    public readonly schoolName: string,
    public readonly memberUserId: string,
    public readonly roleId: string,
    public readonly roleName: string,
    public readonly change: SchoolMemberRoleChange,
    public readonly changedBy: string,
    recipientIds?: string[],
  ) {
    this.recipientIds = recipientIds ?? [memberUserId];
  }
}
