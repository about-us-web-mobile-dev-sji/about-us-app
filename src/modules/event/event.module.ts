import { Module } from '@nestjs/common';
import { EventLogService } from './application/usecases/event-log.service.js';
import { EVENT_LOG_REPOSITORY } from './domain/repositories/event-log.repository.js';
import { InMemoryEventLogRepository } from './infrastructure/persistence/in-memory-event-log.repository.js';
import { InvitationSentListener } from './invitation-sent.listener.js';
import { InvitationAcceptedListener } from './invitation-accepted.listener.js';

@Module({
  providers: [
    EventLogService,
    InvitationSentListener,
    InvitationAcceptedListener,
    {
      provide: EVENT_LOG_REPOSITORY,
      useClass: InMemoryEventLogRepository,
    },
  ],
  exports: [EventLogService],
})
export class EventModule {}