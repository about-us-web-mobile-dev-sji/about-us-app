import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'node:crypto';
import { EventLogService } from './application/usecases/event-log.service.js';
import { InvitationSentEvent } from './invitation-sent.event.js';

@Injectable()
export class InvitationSentListener {
  constructor(private readonly eventLog: EventLogService) {}

  @OnEvent('invitation.sent')
  async handle(event: InvitationSentEvent) {
    new Logger(InvitationSentListener.name).log({
      event: 'invitation.sent',
      schoolId: event.schoolId,
    });

    await this.eventLog.record({
      name: 'invitation.sent',
      entityType: 'school',
      entityId: event.schoolId as UUID,
      payload: { email: event.email, schoolName: event.schoolName },
    });
  }
}
