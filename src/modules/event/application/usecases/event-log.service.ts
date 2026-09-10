import { Inject, Injectable } from '@nestjs/common';
import { EventLog } from '../../domain/entities/event-log.js';
import {
  EVENT_LOG_REPOSITORY,
  type EventLogRepository,
} from '../../domain/repositories/event-log.repository.js';
import { RecordEventLogInput } from '../command/record-event-log.input.js';


@Injectable()
export class EventLogService {
  constructor(
    @Inject(EVENT_LOG_REPOSITORY)
    private readonly eventLogRepository: EventLogRepository,
  ) {}

  async record(input: RecordEventLogInput): Promise<EventLog> {
    const eventLog = EventLog.create({
      ...input,
      payload: input.payload ?? {},
    });

    await this.eventLogRepository.save(eventLog);
    return eventLog;
  }

  findByAggregate(
    entityType: string,
    entityId: string,
  ): Promise<EventLog[]> {
    return this.eventLogRepository.findByAggregate(entityType, entityId);
  }
}