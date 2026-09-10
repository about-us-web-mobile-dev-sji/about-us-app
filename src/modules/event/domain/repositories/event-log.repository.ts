import { EventLog } from '../entities/event-log.js';

export const EVENT_LOG_REPOSITORY = Symbol('EVENT_LOG_REPOSITORY');

export interface EventLogRepository {
  save(eventLog: EventLog): Promise<void>;
  findByAggregate(
    aggregateType: string,
    aggregateId: string,
  ): Promise<EventLog[]>;
}