import type {
  EventLogFilters,
  EventLogPagination,
} from '../../domain/repositories/event-log.repository.js';

export interface ListEventLogsInput {
  filters?: EventLogFilters;
  pagination?: EventLogPagination;
}