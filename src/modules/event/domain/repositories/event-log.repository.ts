import { EventLog } from '../entities/event-log.js';
import type { UUID } from 'node:crypto';
import type { PaginatedResult, PaginationParams } from '../../../../shared/domain/pagination.js';

export const EVENT_LOG_REPOSITORY = Symbol('EVENT_LOG_REPOSITORY');

export interface EventLogFilters {
  entityType?: string;
  search?: string;
}

export type EventLogPagination = PaginationParams;
export type PaginatedEventLogs = PaginatedResult<EventLog>;

export interface EventLogRepository {
  save(eventLog: EventLog): Promise<void>;
  findById(id: string): Promise<EventLog | null>;
  findAll(
    filters: EventLogFilters,
    pagination: EventLogPagination,
  ): Promise<PaginatedEventLogs>;
  findByAggregate(
    aggregateType: string,
    aggregateId: UUID,
  ): Promise<EventLog[]>;
}