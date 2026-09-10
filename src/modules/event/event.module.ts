import { Module } from '@nestjs/common';
import { EventLogService } from './application/usecases/event-log.service.js';
import { EVENT_LOG_REPOSITORY } from './domain/repositories/event-log.repository.js';
import { InMemoryEventLogRepository } from './infrastructure/persistence/in-memory-event-log.repository.js';

@Module({
  providers: [
    EventLogService,
    {
      provide: EVENT_LOG_REPOSITORY,
      useClass: InMemoryEventLogRepository,
    },
  ],
  exports: [EventLogService],
})
export class EventModule {}