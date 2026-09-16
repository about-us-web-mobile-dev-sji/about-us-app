import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { createHash } from 'node:crypto';
import { SendNotification } from '../../application/use-cases/commands/send-notification/SendNotification.js';
import { NotificationType } from '../../domain/enums/notification-type.enum.js';
import { UserAccountService } from '../../../user/application/user-account.service.js';
import type { InvitationSentEvent } from '../../../event/invitation-sent.event.js';
import type { InvitationAcceptedEvent } from '../../../event/invitation-accepted.event.js';
import type { SuperAdminCreatedEvent } from '../../../user/domain/events/super-admin-created.event.js';
import type { UserStatusUpdatedEvent } from '../../../user/domain/events/user-status-updated.event.js';

export function eventRequestId(key: string): string {
  const h = createHash('sha256').update(key).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly sendNotification: SendNotification,
    private readonly users: UserAccountService,
  ) {}

  private async dispatch(
    key: string,
    input: Omit<Parameters<SendNotification['handle']>[0], 'requestId'>,
  ) {
    const requestId = eventRequestId(key);
    try {
      await this.sendNotification.handle({ ...input, requestId });
    } catch {
      this.logger.error({
        event: 'notification.request_failed',
        requestId,
      });
    }
  }

  @OnEvent('user.created')
  created(event: { subjectId: string }) {
    return this.dispatch(`welcome:${event.subjectId}`, {
      type: NotificationType.WELCOME,
      recipientIds: [event.subjectId],
      payload: {},
    });
  }

  @OnEvent('super-admin.created')
  welcome(event: SuperAdminCreatedEvent) {
    return this.dispatch(`welcome:${event.subjectId}`, {
      type: NotificationType.WELCOME,
      recipientIds: [event.subjectId],
      payload: {},
    });
  }

  @OnEvent('user.status.updated')
  security(event: UserStatusUpdatedEvent) {
    return this.dispatch(`status:${event.eventId}`, {
      type: NotificationType.SECURITY_ALERT,
      recipientIds: [event.subjectId],
      payload: { status: event.status },
    });
  }

  @OnEvent('invitation.sent')
  async invited(event: InvitationSentEvent) {
    try {
      const recipient = await this.users.notificationRecipientByEmail(
        event.email,
      );
      if (!recipient) {
        this.logger.warn({
          event: 'notification.recipient_unavailable',
        });
        return;
      }
      await this.dispatch(
        `invite:${event.schoolId}:${event.sentAt.toISOString()}`,
        {
          type: NotificationType.MEMBER_INVITED,
          recipientIds: [recipient.id],
          organizationId: event.schoolId,
          payload: { schoolName: event.schoolName },
        },
      );
    } catch {
      this.logger.error({
        event: 'notification.request_failed',
        organizationId: event.schoolId,
      });
    }
  }

  @OnEvent('school.member-role.changed')
  roleChanged(event: {
    eventId: string;
    schoolId: string;
    schoolName: string;
    recipientIds: string[];
  }) {
    return this.dispatch(`role:${event.eventId}`, {
      type: NotificationType.MEMBER_ROLE_CHANGED,
      recipientIds: event.recipientIds,
      organizationId: event.schoolId,
      payload: { schoolName: event.schoolName },
    });
  }

  @OnEvent('invitation.accepted')
  joined(event: InvitationAcceptedEvent) {
    return this.dispatch(
      `joined:${event.schoolId}:${event.acceptedAt.toISOString()}`,
      {
        type: NotificationType.MEMBER_JOINED,
        recipientIds: [event.inviterId],
        organizationId: event.schoolId,
        payload: { schoolName: event.schoolName },
      },
    );
  }
}
