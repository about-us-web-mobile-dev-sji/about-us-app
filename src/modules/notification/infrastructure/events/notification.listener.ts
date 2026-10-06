import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICATION_APP_URL } from '../notification.config.js';
import { OnEvent } from '@nestjs/event-emitter';
import { createHash } from 'node:crypto';
import { SendNotification } from '../../application/use-cases/commands/send-notification/send-notification.js';
import { NotificationType } from '../../domain/enums/notification-type.enum.js';
import { SendInvitationEmail } from '../../application/use-cases/commands/send-invitation-email/send-invitation-email.js';
import { UserAccountService } from '../../../user/application/user-account.service.js';
import type { InvitationSentEvent } from '../../../school/application/events/invitation-sent.event.js';
import type { InvitationAcceptedEvent } from '../../../school/application/events/invitation-accepted.event.js';
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
    @Inject(SendInvitationEmail)
    private readonly sendInvitationEmail: SendInvitationEmail,
    @Inject(NOTIFICATION_APP_URL) private readonly appUrl: string,
  ) {}

  /** UC-16: link to the web page that accepts the invitation after Google sign-in. */
  private acceptUrl(event: InvitationSentEvent): string {
    const url = new URL('/invitations/accept', this.appUrl);
    url.searchParams.set('schoolId', event.schoolId);
    url.searchParams.set('token', event.invitationToken);
    return url.href;
  }

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
        // No account yet: the invitee creates it by accepting the invitation.
        await this.sendInvitationEmail.handle({
          email: event.email,
          schoolName: event.schoolName,
          acceptUrl: this.acceptUrl(event),
        });
        return;
      }
      await this.dispatch(
        `invite:${event.schoolId}:${event.sentAt.toISOString()}`,
        {
          type: NotificationType.MEMBER_INVITED,
          recipientIds: [recipient.id],
          organizationId: event.schoolId,
          payload: {
            schoolName: event.schoolName,
            acceptUrl: this.acceptUrl(event),
          },
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
  async roleChanged(event: {
    eventId: string;
    schoolId: string;
    schoolName: string;
    recipientIds: string[];
  }) {
    // Dispatched one recipient at a time: SendNotification aborts its whole
    // batch on the first recipient it can't resolve, which previously meant
    // a stale/deleted previous-admin account could silently prevent the new
    // admin from ever being notified.
    await Promise.allSettled(
      event.recipientIds.map((recipientId) =>
        this.dispatch(`role:${event.eventId}:${recipientId}`, {
          type: NotificationType.MEMBER_ROLE_CHANGED,
          recipientIds: [recipientId],
          organizationId: event.schoolId,
          payload: { schoolName: event.schoolName },
        }),
      ),
    );
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
