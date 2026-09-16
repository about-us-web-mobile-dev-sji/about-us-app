import nodemailer from 'nodemailer';
import type {
  EmailMessage,
  EmailSender,
} from '../../application/gateways/i-email-sender.gateway.js';
import type { NotificationConfig } from '../notification.config.js';

export class SmtpEmailSender implements EmailSender {
  private readonly transport;

  constructor(private readonly config: NotificationConfig) {
    this.transport = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      requireTLS: !config.smtpSecure,
      auth: config.smtpUser
        ? { user: config.smtpUser, pass: config.smtpPassword }
        : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.config.emailEnabled) {
      throw new Error('EMAIL_DISABLED');
    }
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(message.to)) {
      throw new Error('INVALID_ADDRESS');
    }
    const result = await this.transport.sendMail({
      to: { address: message.to, name: '' },
      from: this.config.from,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    if (!result.accepted.length) throw new Error('SMTP_REJECTED');
  }
}
