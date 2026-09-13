import { EventLog } from '../../domain/entities/event-log.js';
import type { EventLogRepository } from '../../domain/repositories/event-log.repository.js';
import type { UUID } from 'node:crypto';
import type {
  EventLogFilters,
  EventLogPagination,
  PaginatedEventLogs,
} from '../../domain/repositories/event-log.repository.js';

export class InMemoryEventLogRepository implements EventLogRepository {
  private readonly eventLogs: EventLog[] = [];

  async save(eventLog: EventLog): Promise<void> {
    this.eventLogs.push(eventLog);
  }

  async findById(id: string): Promise<EventLog | null> {
    return this.eventLogs.find((eventLog) => eventLog.id === id) ?? null;
  }

  async findAll(
    filters: EventLogFilters,
    pagination: EventLogPagination,
  ): Promise<PaginatedEventLogs> {
    const filtered = this.eventLogs.filter((eventLog) => {
      const matchesType =
        !filters.entityType || eventLog.entityType === filters.entityType;
      const search = filters.search?.toLowerCase();
      const matchesSearch =
        !search ||
        [
          eventLog.name,
          eventLog.entityType,
          eventLog.entityId,
          eventLog.actorId ?? '',
          JSON.stringify(eventLog.payload),
        ].some((value) => value.toLowerCase().includes(search));
      return matchesType && matchesSearch;
    });
    const start = (pagination.page - 1) * pagination.limit;

    return {
      items: filtered.slice(start, start + pagination.limit),
      total: filtered.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(filtered.length / pagination.limit),
    };
  }

  async findByAggregate(
    entityType: string,
    entityId: UUID,
  ): Promise<EventLog[]> {
    return this.eventLogs.filter(
      (eventLog) =>
        eventLog.entityType === entityType &&
        eventLog.entityId === entityId,
    );
  }
}