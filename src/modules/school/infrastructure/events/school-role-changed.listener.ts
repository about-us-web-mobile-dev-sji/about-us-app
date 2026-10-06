import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'node:crypto';
import { EventLogService } from '../../../event/application/services/event-log.service.js';
import type { SchoolRoleChangedEvent } from '../../application/events/school-role-changed.event.js';

@Injectable()
export class SchoolRoleChangedListener {
  constructor(private readonly eventLog: EventLogService) {}

  @OnEvent('school.role.changed')
  async handle(event: SchoolRoleChangedEvent) {
    await this.eventLog.record({
      name: 'school.role.changed',
      message: `Le rôle "${event.roleName}" de l'école "${event.schoolName}" a été modifié.`,
      entityType: 'school',
      entityId: event.schoolId as UUID,
      payload: {
        roleId: event.roleId,
        roleName: event.roleName,
        change: event.change,
        permissions: [...event.permissions],
        changedBy: event.changedBy,
      },
    });
  }
}
