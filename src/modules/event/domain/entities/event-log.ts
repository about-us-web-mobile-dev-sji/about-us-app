import { randomUUID, UUID } from 'node:crypto';

export interface EventLogProps {
  id: string;
  name: string;
  entityType: string; 
  entityId: UUID;
  actorId?: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export class EventLog {
  static readonly ENTITY_TYPE = 'event_log';

  private constructor(private readonly props: EventLogProps) {}

  static create(input: Omit<EventLogProps, 'id' | 'occurredAt'> & {
    occurredAt?: Date;
  }): EventLog {
    if (!input.name.trim()) {
      throw new Error('Event name is required');
    }

    if (!input.entityType.trim() || !input.entityId) {
      throw new Error('Event entity is required');
    }

    return new EventLog({
      ...input,
      id: randomUUID(),
      occurredAt: input.occurredAt ?? new Date(),
    });
  }

  static reconstitute(props: EventLogProps): EventLog {
    return new EventLog({
      ...props,
      payload: { ...props.payload },
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get entityType(): string {
    return this.props.entityType;
  }

  get entityId(): UUID {
    return this.props.entityId;
  }

  get actorId(): string | undefined {
    return this.props.actorId;
  }

  get payload(): Record<string, unknown> {
    return { ...this.props.payload };
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }
}