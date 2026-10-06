import { NotificationType } from '../../../../domain/enums/notification-type.enum.js';
import { InvalidNotificationException } from '../../../../domain/exceptions/invalid-notification.exception.js';
import type { EmailSender } from '../../../gateways/i-email-sender.gateway.js';
import type { NotificationTemplates } from '../../../gateways/i-notification-templates.gateway.js';

export interface SendInvitationEmailInput {
  email: string;
  schoolName: string;
  acceptUrl: string;
  locale?: string;
}

/**
 * Invites someone who has no account yet: no in-app notification is possible,
 * so the invitation only goes out by e-mail.
 */
export class SendInvitationEmail {
  constructor(
    private readonly templates: NotificationTemplates,
    private readonly email: EmailSender,
    private readonly config: { enabled: boolean; emailEnabled: boolean },
  ) {}

  async handle(input: SendInvitationEmailInput): Promise<void> {
    if (!input.email?.trim() || !input.schoolName || !input.acceptUrl)
      throw new InvalidNotificationException('Invitation e-mail is incomplete');
    if (!this.config.enabled || !this.config.emailEnabled) return;
    const rendered = this.templates.render(
      NotificationType.MEMBER_INVITED,
      this.templates.resolveLocale(input.locale),
      { schoolName: input.schoolName, acceptUrl: input.acceptUrl },
    );
    await this.email.send({
      to: input.email,
      subject: rendered.title,
      text: rendered.message,
      html: rendered.html,
    });
  }
}
