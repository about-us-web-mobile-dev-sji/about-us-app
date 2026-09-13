import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'node:crypto';
import { EventLogService } from './application/usecases/event-log.service.js';
import { InvitationSentEvent } from './invitation-sent.event.js';

@Injectable()
export class InvitationSentListener {
  constructor(private readonly eventLog: EventLogService) {}

  @OnEvent('invitation.sent')
  async handle(event: InvitationSentEvent) {
    console.log(
      `[ÉVÉNEMENT REÇU] Invitation envoyée à ${event.email} pour l'école "${event.schoolName}" (${event.schoolId}) à ${event.sentAt.toISOString()}`,
    );

    await this.eventLog.record({
      name: 'invitation.sent',
      entityType: 'school',
      entityId: event.schoolId as UUID,
      payload: { email: event.email, schoolName: event.schoolName },
    });
  }
}