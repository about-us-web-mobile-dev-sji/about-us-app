import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  NotFoundException,
} from '@nestjs/common';
import type { UUID } from 'node:crypto';
import { ListEventLogs } from '../../application/usecases/list-event-logs.js';
import { GetEventLog } from '../../application/usecases/get-event-log.js';
import { EventLogService } from '../../application/usecases/event-log.service.js';
import {
  EventLogRequestMapper,
  type EventLogListRequest,
} from './requests/event-log.request.js';
import { EventLogResponseMapper } from './responses/event-log.response.js';

@Controller('event-logs')
export class EventLogController {
  constructor(
    private readonly listEventLogs: ListEventLogs,
    private readonly getEventLog: GetEventLog,
    private readonly eventLogs: EventLogService,
  ) {}

  @Get()
  async list(@Query() request: EventLogListRequest) {
    const input = EventLogRequestMapper.toListInput(request);
    if (input.pagination && (input.pagination.page < 1 || input.pagination.limit < 1))
      throw new BadRequestException('page and limit must be positive');

    return EventLogResponseMapper.list(await this.listEventLogs.execute(input));
  }

  @Get('aggregate/:entityType/:entityId')
  async findByAggregate(
    @Param('entityType') entityType: string,
    @Param('entityId', new ParseUUIDPipe({ version: '4' })) entityId: UUID,
  ) {
    const logs = await this.eventLogs.findByAggregate(entityType, entityId);
    return logs.map((log) => EventLogResponseMapper.one(log));
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: UUID) {
    const log = await this.getEventLog.execute(id);
    if (!log) throw new NotFoundException('Event log not found');

    return EventLogResponseMapper.one(log);
  }
}