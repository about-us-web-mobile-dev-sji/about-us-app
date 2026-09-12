import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_LOG_REPOSITORY,
  type EventLogRepository,
} from '../../domain/repositories/event-log.repository.js';
import type { ListEventLogsInput } from './list-event-logs.input.js';
import type { ListEventLogsOutput } from './list-event-logs.output.js';

@Injectable()
export class ListEventLogs {
  constructor(
    @Inject(EVENT_LOG_REPOSITORY)
    private readonly eventLogs: EventLogRepository,
  ) {}

  execute(input: ListEventLogsInput = {}): Promise<ListEventLogsOutput> {
    return this.eventLogs.findAll(
      input.filters ?? {},
      input.pagination ?? { page: 1, limit: 10 },
    );
  }
}