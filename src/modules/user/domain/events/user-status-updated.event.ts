import type UserStatus from '../enum/user-status.enum.js';
import type { UUID } from 'node:crypto';

export class UserStatusUpdatedEvent {
  constructor(
    public readonly subjectId: UUID,
    public readonly previousStatus: UserStatus,
    public readonly status: UserStatus,
  ) {}
}