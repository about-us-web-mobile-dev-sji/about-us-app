import type { SendNotificationInput } from './SendNotificationInput.js';
import {
  Notification,
  severityFor,
} from '../../../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../../../domain/repositories/i-notification.repository.js';
import { NotificationType } from '../../../../domain/enums/notification-type.enum.js';
import { InvalidNotificationException } from '../../../../domain/exceptions/invalid-notification.exception.js';
import { RecipientNotFoundException } from '../../../../domain/exceptions/recipient-not-found.exception.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';
import type { EmailSender } from '../../../gateways/i-email-sender.gateway.js';
import type { NotificationTemplates } from '../../../gateways/i-notification-templates.gateway.js';
import { Channel } from '../../../../domain/enums/channel.enum.js';
import { isUUID } from 'class-validator';

const payloadKeys: Record<NotificationType, string[]> = {
  [NotificationType.WELCOME]: ['firstName'],
  [NotificationType.SECURITY_ALERT]: ['status'],
  [NotificationType.MEMBER_INVITED]: ['schoolName'],
  [NotificationType.MEMBER_JOINED]: ['schoolName'],
  [NotificationType.MEMBER_ROLE_CHANGED]: ['schoolName'],
};

export class SendNotification {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly users: UserAccountService,
    private readonly templates: NotificationTemplates,
    private readonly email: EmailSender,
    private readonly config: {
      enabled: boolean;
      emailEnabled: boolean;
      defaultLocale: string;
    },
    private readonly logError: (fields: Record<string, unknown>) => void = () =>
      {},
  ) {}

  async handle(input: SendNotificationInput): Promise<void> {
    this.validate(input);
    if (!this.config.enabled) return;

    const sendInApp =
      !input.channels || input.channels.includes(Channel.IN_APP);
    const sendEmail =
      !input.channels || input.channels.includes(Channel.EMAIL);

    for (const recipientId of new Set(input.recipientIds)) {
      if (
        await this.notifications.existsByRequestAndRecipient(
          input.requestId,
          recipientId,
        )
      ) {
        continue;
      }

      const recipient = await this.users.notificationRecipient(recipientId);
      if (!recipient) throw new RecipientNotFoundException();

      const locale = this.templates.resolveLocale(
        input.locale,
        this.config.defaultLocale,
      );
      const rendered = this.templates.render(input.type, locale, input.payload);

      if (sendInApp) {
        await this.notifications.save(
          Notification.create({
            requestId: input.requestId,
            recipientId,
            organizationId: input.organizationId ?? null,
            type: input.type,
            severity: severityFor(input.type),
            title: rendered.title,
            message: rendered.message,
            payload: { ...input.payload },
            locale,
          }),
        );
      }

      if (!sendEmail || !this.config.emailEnabled) continue;

      try {
        await this.email.send({
          to: recipient.email,
          subject: rendered.title,
          text: rendered.message,
          html: rendered.html,
        });
      } catch (e) {

        const errorInstance = e instanceof Error ? e : new Error(String(e));

      
        this.logError({
          event: 'notification.email_failed',
          requestId: input.requestId,
          recipientId: recipientId,
          type: input.type,
          errorMessage: errorInstance.message,
          errorStack: errorInstance.stack,
          originalError: e, // Permet de garder l'objet d'origine si votre logger le supporte
        });
      }
    }
  }

  private validate(input: SendNotificationInput): void {
    if (
      !input ||
      !isUUID(input.requestId) ||
      !Array.isArray(input.recipientIds) ||
      !input.recipientIds.length ||
      input.recipientIds.length > 100 ||
      input.recipientIds.some((id) => !isUUID(id)) ||
      !Object.values(NotificationType).includes(input.type) ||
      (input.organizationId != null && !isUUID(input.organizationId))
    ) {
      throw new InvalidNotificationException('Invalid notification request');
    }

    if (
      input.channels !== undefined &&
      (!Array.isArray(input.channels) ||
        input.channels.length === 0 ||
        input.channels.some((c) => !Object.values(Channel).includes(c)))
    ) {
      throw new InvalidNotificationException('Invalid notification channels');
    }

    if (
      !input.payload ||
      typeof input.payload !== 'object' ||
      Array.isArray(input.payload)
    ) {
      throw new InvalidNotificationException('Invalid notification payload');
    }

    const allowed = payloadKeys[input.type];
    if (
      Object.keys(input.payload).some((key) => !allowed.includes(key)) ||
      Object.values(input.payload).some(
        (value) => typeof value !== 'string' || value.length > 200,
      )
    ) {
      throw new InvalidNotificationException('Invalid notification payload');
    }

    if (
      (input.type === NotificationType.MEMBER_INVITED ||
        input.type === NotificationType.MEMBER_JOINED ||
        input.type === NotificationType.MEMBER_ROLE_CHANGED) &&
      typeof input.payload.schoolName !== 'string'
    ) {
      throw new InvalidNotificationException('schoolName is required');
    }
  }
}
