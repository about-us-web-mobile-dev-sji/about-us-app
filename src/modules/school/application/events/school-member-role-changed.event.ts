import { randomUUID } from 'node:crypto';
import type { SchoolRole } from '../../domain/enums/school-role.enum.js';

export type SchoolMemberRoleChange = 'ASSIGNED' | 'REMOVED';

export class SchoolMemberRoleChangedEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();
  readonly recipientIds: string[];

  constructor(
    public readonly schoolId: string,
    public readonly schoolName: string,
    public readonly memberUserId: string,
    public readonly role: SchoolRole,
    public readonly change: SchoolMemberRoleChange,
    public readonly changedBy: string,
    recipientIds?: string[],
  ) {
    this.recipientIds = recipientIds ?? [memberUserId];
  }
}
