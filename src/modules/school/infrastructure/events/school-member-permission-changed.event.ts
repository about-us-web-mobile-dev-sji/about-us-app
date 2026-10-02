import { randomUUID } from 'node:crypto';

export type SchoolMemberPermissionChange = 'GRANTED' | 'REVOKED';

// Emitted as 'school.member-permission.granted' / 'school.member-permission.revoked'.
// `grantedBy` is the actor who performed the change (grant or removal).
export class SchoolMemberPermissionChangedEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();
  readonly recipientIds: string[];

  constructor(
    public readonly schoolId: string,
    public readonly schoolName: string,
    public readonly memberUserId: string,
    public readonly action: string,
    public readonly change: SchoolMemberPermissionChange,
    public readonly grantedBy: string,
  ) {
    this.recipientIds = [memberUserId];
  }
}
