import { randomUUID } from 'node:crypto';

export type SchoolRoleChange = 'CREATED' | 'UPDATED' | 'DELETED';

export class SchoolRoleChangedEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly schoolId: string,
    public readonly schoolName: string,
    public readonly roleId: string,
    public readonly roleName: string,
    public readonly change: SchoolRoleChange,
    public readonly changedBy: string,
    public readonly permissions: readonly string[] = [],
  ) {}
}
