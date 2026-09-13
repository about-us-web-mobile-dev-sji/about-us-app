import { EventLog } from '../entities/event-log.js';
import type { UUID } from 'node:crypto';

export const EVENT_LOG_REPOSITORY = Symbol('EVENT_LOG_REPOSITORY');

export interface EventLogFilters {
  entityType?: string;
  search?: string;
}

export interface EventLogPagination {
  page: number;
  limit: number;
}

export interface PaginatedEventLogs {
  items: EventLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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