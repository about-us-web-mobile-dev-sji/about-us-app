import { EventLog } from '../../../domain/entities/event-log.js';
import type { EventLogEntity } from '../typeorm/event-log.entity.js';

export const EventLogPersistenceMapper = {
  toEntity(log: EventLog): EventLogEntity {
    return {
      id: log.id,
      name: log.name,
      entityType: log.entityType,
      entityId: log.entityId,
      actorId: log.actorId ?? null,
      payload: log.payload,
      occurredAt: log.occurredAt,
    };
  },

  toDomain(row: EventLogEntity): EventLog {
    return EventLog.reconstitute({
      id: row.id,
      name: row.name,
      entityType: row.entityType,
      entityId: row.entityId,
      actorId: row.actorId ?? undefined,
      payload: row.payload,
      occurredAt: row.occurredAt,
    });
  },
};