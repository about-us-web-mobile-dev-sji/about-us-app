import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'node:crypto';
import { EventLogService } from '../../../event/application/services/event-log.service.js';
import type { SchoolMemberRoleChangedEvent } from './school-member-role-changed.event.js';

@Injectable()
export class SchoolMemberRoleChangedListener {
  constructor(private readonly eventLog: EventLogService) {}

  @OnEvent('school.member-role.changed')
  async handle(
    event: Pick<SchoolMemberRoleChangedEvent, 'schoolId' | 'schoolName' | 'recipientIds'> &
      Partial<SchoolMemberRoleChangedEvent>,
  ) {
    await this.eventLog.record({
      name: 'school.member-role.changed',
      message: `Le rôle d'un membre de l'école "${event.schoolName}" a été modifié.`,
      entityType: 'school',
      entityId: event.schoolId as UUID,
      payload: {
        memberUserId: event.memberUserId ?? null,
        previousRole: event.previousRole ?? null,
        newRole: event.newRole ?? null,
        changedBy: event.changedBy ?? null,
        recipientIds: event.recipientIds,
      },
    });
  }
}
