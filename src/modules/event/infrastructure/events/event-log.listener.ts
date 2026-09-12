import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { User } from '../../../user/domain/entities/user.entity.js';
import { EventLogService } from '../../application/usecases/event-log.service.js';
import { SuperAdminCreatedEvent } from '../../../user/domain/events/super-admin-created.event.js';
import { UserStatusUpdatedEvent } from '../../../user/domain/events/user-status-updated.event.js';

@Injectable()
export class EventLogListener {
  constructor(private readonly eventLogs: EventLogService) {}

  @OnEvent('super-admin.created', { suppressErrors: false })
  async handleSuperAdminCreated(event: SuperAdminCreatedEvent): Promise<void> {
    await this.eventLogs.record({
      name: 'super-admin.created',
      entityType: User.ENTITY_TYPE,
      entityId: event.subjectId,
      payload: {
        email: event.email,
      },
    });
  }

  @OnEvent('user.status.updated', { suppressErrors: false })
  async handleUserStatusUpdated(event: UserStatusUpdatedEvent): Promise<void> {
    await this.eventLogs.record({
      name: 'user.status.updated',
      entityType: User.ENTITY_TYPE,
      entityId: event.subjectId,
      payload: {
        previousStatus: event.previousStatus,
        status: event.status,
      },
    });
  }
}