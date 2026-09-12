import { Module } from '@nestjs/common';
import { EventLogService } from './application/usecases/event-log.service.js';
import { EVENT_LOG_REPOSITORY } from './domain/repositories/event-log.repository.js';
import { EventLogListener } from './infrastructure/events/event-log.listener.js';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventLogEntity } from './infrastructure/persistence/typeorm/event-log.entity.js';
import { TypeormEventLogRepository } from './infrastructure/persistence/typeorm-event-log.repository.js';
import { EventLogController } from './infrastructure/http/event-log.controller.js';
import { ListEventLogs } from './application/usecases/list-event-logs.js';
import { GetEventLog } from './application/usecases/get-event-log.js';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([EventLogEntity])],
  controllers: [EventLogController],
  providers: [
    EventLogService,
    ListEventLogs,
    GetEventLog,
    EventLogListener,
    {
      provide: EVENT_LOG_REPOSITORY,
      useClass: TypeormEventLogRepository,
    },
  ],
  exports: [EventLogService],
})
export class EventModule {}