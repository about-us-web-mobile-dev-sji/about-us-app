import { randomUUID, UUID } from 'node:crypto';
import { InvalidEventLogException } from '../exceptions/invalid-event-log.exception.js';

export interface EventLogProps {
  id: string;
  name: string;
  message: string;
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
      throw new InvalidEventLogException(
        "Le nom de l'événement est obligatoire.",
      );
    }

    if (!input.message.trim()) {
      throw new InvalidEventLogException(
        "Le message de l'événement est obligatoire.",
      );
    }

    if (!input.entityType.trim() || !input.entityId) {
      throw new InvalidEventLogException(
        "L'entité associée à l'événement est obligatoire.",
      );
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

  get message(): string {
    return this.props.message;
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