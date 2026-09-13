import type { UUID } from 'node:crypto';

export class SuperAdminCreatedEvent {
  constructor(
    public readonly subjectId: UUID,
    public readonly email: string,
  ) {}
}
