import { randomUUID } from 'node:crypto';
import type UserStatus from '../enum/user-status.enum.js';
import type { UUID } from 'node:crypto';

export class UserStatusUpdatedEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    public readonly subjectId: UUID,
    public readonly previousStatus: UserStatus,
    public readonly status: UserStatus,
  ) {}
}
