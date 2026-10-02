import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'node:crypto';
import { EventLogService } from '../../../event/application/services/event-log.service.js';
import type { SchoolMemberPermissionChangedEvent } from './school-member-permission-changed.event.js';

@Injectable()
export class SchoolMemberPermissionChangedListener {
  constructor(private readonly eventLog: EventLogService) {}

  @OnEvent('school.member-permission.granted')
  async onGranted(event: SchoolMemberPermissionChangedEvent) {
    await this.record('school.member-permission.granted', 'accordée', event);
  }

  @OnEvent('school.member-permission.revoked')
  async onRevoked(event: SchoolMemberPermissionChangedEvent) {
    await this.record('school.member-permission.revoked', 'retirée', event);
  }

  private async record(
    name: string,
    verb: string,
    event: SchoolMemberPermissionChangedEvent,
  ) {
    await this.eventLog.record({
      name,
      message: `Une permission a été ${verb} à un membre de l'école "${event.schoolName}".`,
      entityType: 'school',
      entityId: event.schoolId as UUID,
      payload: {
        memberUserId: event.memberUserId,
        action: event.action,
        change: event.change,
        grantedBy: event.grantedBy,
        recipientIds: event.recipientIds,
      },
    });
  }
}
