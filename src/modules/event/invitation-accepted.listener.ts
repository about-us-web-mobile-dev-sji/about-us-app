import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'node:crypto';
import { EventLogService } from './application/usecases/event-log.service.js';
import { InvitationAcceptedEvent } from './invitation-accepted.event.js';

@Injectable()
export class InvitationAcceptedListener {
  constructor(private readonly eventLog: EventLogService) {}

  @OnEvent('invitation.accepted')
  async handle(event: InvitationAcceptedEvent) {
    console.log(
      `[ÉVÉNEMENT REÇU] L'invitation pour l'école "${event.schoolName}" (${event.schoolId}) a été acceptée par ${event.adminUserId} -> l'invitant ${event.inviterId} est informé à ${event.acceptedAt.toISOString()}`,
    );

    await this.eventLog.record({
      name: 'invitation.accepted',
      entityType: 'school',
      entityId: event.schoolId as UUID,
      payload: {
        inviterId: event.inviterId,
        schoolName: event.schoolName,
        adminUserId: event.adminUserId,
      },
    });
  }
}