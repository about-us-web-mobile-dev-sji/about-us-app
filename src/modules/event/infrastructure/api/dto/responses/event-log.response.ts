import type { EventLog } from '../../../../domain/entities/event-log.js';
import { summaryOf, type UserSummaries, type UserSummary } from '../../../../../user/application/user-directory.js';
import type { ListEventLogsOutput } from '../../../../application/usecases/queries/list-event-log/list-event-logs.output.js';

export interface EventLogResponse {
  id: string;
  name: string;
  message: string;
  entityType: string;
  entityId: string;
  actor: UserSummary | null;
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
  one(log: EventLog, users: UserSummaries): EventLogResponse {
    return {
      id: log.id,
      name: log.name,
      message: log.message,
      entityType: log.entityType,
      entityId: log.entityId,
      actor: summaryOf(users, log.actorId),
      payload: log.payload,
      occurredAt: log.occurredAt,
    };
  },

  list(output: ListEventLogsOutput, users: UserSummaries): ListEventLogsResponse {
    return {
      items: output.items.map((log) => EventLogResponseMapper.one(log, users)),
      total: output.total,
      page: output.page,
      limit: output.limit,
      totalPages: output.totalPages,
    };
  },
};