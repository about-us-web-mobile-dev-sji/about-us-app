import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_LOG_REPOSITORY,
  type EventLogRepository,
} from '../../domain/repositories/event-log.repository.js';

@Injectable()
export class GetEventLog {
  constructor(
    @Inject(EVENT_LOG_REPOSITORY)
    private readonly eventLogs: EventLogRepository,
  ) {}

  execute(id: string) {
    return this.eventLogs.findById(id);
  }
}