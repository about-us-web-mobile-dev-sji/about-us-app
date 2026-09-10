import { EventLog } from '../../domain/entities/event-log.js';
import type { EventLogRepository } from '../../domain/repositories/event-log.repository.js';

export class InMemoryEventLogRepository implements EventLogRepository {
  private readonly eventLogs: EventLog[] = [];

  async save(eventLog: EventLog): Promise<void> {
    this.eventLogs.push(eventLog);
  }

  async findByAggregate(
    entityType: string,
    entityId: string,
  ): Promise<EventLog[]> {
    return this.eventLogs.filter(
      (eventLog) =>
        eventLog.entityType === entityType &&
        eventLog.entityId === entityId,
    );
  }
}