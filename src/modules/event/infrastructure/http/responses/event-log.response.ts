import type { EventLog } from '../../../domain/entities/event-log.js';
import type { ListEventLogsOutput } from '../../../application/usecases/list-event-logs.output.js';

export interface EventLogResponse {
  id: string;
  name: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface ListEventLogsResponse {
  items: EventLogResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const EventLogResponseMapper = {
  one(log: EventLog): EventLogResponse {
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

  list(output: ListEventLogsOutput): ListEventLogsResponse {
    return {
      items: output.items.map((log) => EventLogResponseMapper.one(log)),
      total: output.total,
      page: output.page,
      limit: output.limit,
      totalPages: output.totalPages,
    };
  },
};