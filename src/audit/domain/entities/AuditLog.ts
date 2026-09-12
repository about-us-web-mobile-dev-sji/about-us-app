import { AuditAction } from '../enums/AuditAction.js';

export class AuditLog {
  constructor(
    private readonly id: string,
    private readonly action: AuditAction,
    private readonly entityType: string,
    private readonly entityId: string,
    private readonly actorId: string,
    private readonly metadata: Record<string, any>,
    private readonly createdAt: Date,
  ) {}

  getId(): string {
    return this.id;
  }

  getAction(): AuditAction {
    return this.action;
  }

  getEntityType(): string {
    return this.entityType;
  }

  getEntityId(): string {
    return this.entityId;
  }

  getActorId(): string {
    return this.actorId;
  }

  getMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
