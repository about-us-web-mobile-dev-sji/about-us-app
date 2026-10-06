import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'node:crypto';
import { EventLogService } from '../../../event/application/services/event-log.service.js';
import type { SchoolMemberRoleChangedEvent } from '../../application/events/school-member-role-changed.event.js';

@Injectable()
export class SchoolMemberRoleChangedListener {
  constructor(private readonly eventLog: EventLogService) {}

  @OnEvent('school.member-role.changed')
  async handle(event: SchoolMemberRoleChangedEvent) {
    await this.eventLog.record({
      name: 'school.member-role.changed',
      message: `Les rôles d'un membre de l'école "${event.schoolName}" ont été modifiés.`,
      entityType: 'school',
      entityId: event.schoolId as UUID,
      payload: {
        memberUserId: event.memberUserId,
        roleId: event.roleId,
        roleName: event.roleName,
        change: event.change,
        changedBy: event.changedBy,
        recipientIds: event.recipientIds,
      },
    });
  }
}
