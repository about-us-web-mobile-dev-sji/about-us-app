import type { ListEventLogsInput } from '../../../application/usecases/list-event-logs.input.js';

export interface EventLogListRequest {
  entityType?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export const EventLogRequestMapper = {
  toListInput(request: EventLogListRequest): ListEventLogsInput {
    return {
      filters: {
        entityType: request.entityType,
        search: request.search,
      },
      pagination: {
        page: Number(request.page ?? 1),
        limit: Number(request.limit ?? 10),
      },
    };
  },
};