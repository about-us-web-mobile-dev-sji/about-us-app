import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import {
  Notification,
  severityFor,
} from './domain/entities/notification.entity.js';
import { NotificationType } from './domain/enums/notification-type.enum.js';
import { Channel } from './domain/enums/channel.enum.js';
import { Severity } from './domain/enums/severity.enum.js';
import { notificationConfig } from './infrastructure/notification.config.js';
import {
  CatalogNotificationTemplates,
  escapeHtml,
} from './infrastructure/templates/notification-templates.js';
import { SmtpEmailSender } from './infrastructure/email/smtp-email-sender.js';
import { SendNotification } from './application/use-cases/commands/send-notification/SendNotification.js';
import { MarkNotificationRead } from './application/use-cases/commands/mark-notification-read/MarkNotificationRead.js';
import { ListNotifications } from './application/use-cases/queries/list-notifications/ListNotifications.js';
import { GetNotification } from './application/use-cases/queries/get-notification/GetNotification.js';
import { CountUnreadNotifications } from './application/use-cases/queries/count-unread-notifications/CountUnreadNotifications.js';
import { NotificationListener } from './infrastructure/events/notification.listener.js';
import { InvalidNotificationException } from './domain/exceptions/invalid-notification.exception.js';
import { RecipientNotFoundException } from './domain/exceptions/recipient-not-found.exception.js';
import { NotificationNotFoundException } from './domain/exceptions/notification-not-found.exception.js';
import type { SendNotificationInput } from './application/use-cases/commands/send-notification/SendNotificationInput.js';

export const makeSendNotificationInput = (
  overrides?: Partial<SendNotificationInput>,
): SendNotificationInput => ({
  requestId: randomUUID(),
  recipientIds: [randomUUID()],
  type: NotificationType.WELCOME,
  payload: { firstName: 'Alice' },
  ...overrides,
});

describe('Notification domain entity', () => {
  it('creates an unread notification and preserves the first read timestamp', () => {
    const n = Notification.create({
      requestId: randomUUID(),
      recipientId: randomUUID(),
      organizationId: null,
      type: NotificationType.WELCOME,
      severity: Severity.INFO,
      title: 'Welcome',
      message: 'Hello',
      payload: {},
      locale: 'en',
    });

    expect(n.readAt).toBeNull();
    const first = new Date();
    n.markAsRead(first);
    n.markAsRead(new Date(first.getTime() + 1000));
    expect(n.readAt).toBe(first);
  });

  it('reconstitutes and serializes primitives correctly', () => {
    const props = {
      id: randomUUID(),
      requestId: randomUUID(),
      recipientId: randomUUID(),
      organizationId: null,
      type: NotificationType.SECURITY_ALERT,
      severity: Severity.WARNING,
      title: 'Security Alert',
      message: 'Account suspended',
      payload: { status: 'SUSPENDED' },
      locale: 'fr',
      createdAt: new Date(),
      readAt: null,
    };

    const n = Notification.reconstitute(props);
    expect(n.id).toBe(props.id);
    expect(n.recipientId).toBe(props.recipientId);
    expect(n.requestId).toBe(props.requestId);
    expect(n.type).toBe(NotificationType.SECURITY_ALERT);
    expect(n.title).toBe(props.title);
    expect(n.message).toBe(props.message);
    expect(n.locale).toBe('fr');
    expect(n.toPrimitives()).toEqual(props);
  });

  it('determines severity based on notification type', () => {
    expect(severityFor(NotificationType.SECURITY_ALERT)).toBe(Severity.WARNING);
    expect(severityFor(NotificationType.WELCOME)).toBe(Severity.INFO);
    expect(severityFor(NotificationType.MEMBER_INVITED)).toBe(Severity.INFO);
  });
});

describe('Notification templates and HTML escaping', () => {
  const templates = new CatalogNotificationTemplates('fr');

  it('resolves supported locales with default fallback', () => {
    expect(templates.resolveLocale('fr-FR')).toBe('fr');
    expect(templates.resolveLocale('en-US')).toBe('en');
    expect(templates.resolveLocale('de-DE')).toBe('fr');
    expect(templates.resolveLocale(undefined, 'en-GB')).toBe('en');
  });

  it('renders localized messages and html for welcome and member invitation', () => {
    const fr = templates.render(NotificationType.WELCOME, 'fr', {});
    expect(fr.title).toBe('Bienvenue sur About Us');
    expect(fr.html).toContain('Bienvenue sur About Us');

    const en = templates.render(NotificationType.MEMBER_INVITED, 'en', {
      schoolName: 'Oxford High',
    });
    expect(en.title).toBe('School invitation');
    expect(en.message).toContain('Oxford High');
    expect(en.html).toContain('Oxford High');
  });

  it('escapes HTML special characters in values', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
    );
    expect(escapeHtml(`&"'<>`)).toBe('&amp;&quot;&#39;&lt;&gt;');

    const rendered = templates.render(NotificationType.MEMBER_INVITED, 'fr', {
      schoolName: '<img src=x onerror=alert(1)>',
    });
    expect(rendered.html).not.toContain('<img');
    expect(rendered.html).toContain('&lt;img');
  });
});

describe('SmtpEmailSender', () => {
  it('throws EMAIL_DISABLED when email is disabled', async () => {
    const sender = new SmtpEmailSender(notificationConfig({}));
    await expect(
      sender.send({
        to: 'user@example.com',
        subject: 'Hello',
        text: 'World',
        html: '<p>World</p>',
      }),
    ).rejects.toThrow('EMAIL_DISABLED');
  });

  it('throws INVALID_ADDRESS for malformed recipient email addresses', async () => {
    const config = notificationConfig({
      EMAIL_ENABLED: 'true',
      SMTP_HOST: 'smtp.example.com',
      EMAIL_FROM_ADDRESS: 'noreply@example.com',
    });
    const sender = new SmtpEmailSender(config);
    await expect(
      sender.send({
        to: 'not-an-email',
        subject: 'Hello',
        text: 'World',
        html: '<p>World</p>',
      }),
    ).rejects.toThrow('INVALID_ADDRESS');
  });
});

describe('SendNotification use case', () => {
  function setup() {
    const savedNotifications: Notification[] = [];
    const repository = {
      existsByRequestAndRecipient: vi.fn(async () => false),
      save: vi.fn(async (n: Notification) => {
        savedNotifications.push(n);
        return n;
      }),
      findByIdForRecipient: vi.fn(),
      findInbox: vi.fn(),
      countUnread: vi.fn(),
      markRead: vi.fn(),
    };

    const users = {
      notificationRecipient: vi.fn(async (id: string) => ({
        id,
        email: 'user@example.com',
      })),
      notificationRecipientByEmail: vi.fn(),
    };

    const templates = new CatalogNotificationTemplates('fr');
    const emailSender = {
      send: vi.fn(async () => {}),
    };
    const logError = vi.fn();

    const config = {
      enabled: true,
      emailEnabled: true,
      defaultLocale: 'fr',
    };

    const useCase = new SendNotification(
      repository,
      users as any,
      templates,
      emailSender,
      config,
      logError,
    );

    return {
      useCase,
      repository,
      users,
      emailSender,
      logError,
      savedNotifications,
      config,
    };
  }

  it('sends both in-app notification and email by default', async () => {
    const { useCase, repository, emailSender, savedNotifications } = setup();
    const input = makeSendNotificationInput();

    await useCase.handle(input);

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(savedNotifications).toHaveLength(1);
    expect(savedNotifications[0].recipientId).toBe(input.recipientIds[0]);
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
      }),
    );
  });

  it('only saves in-app when channels includes only IN_APP', async () => {
    const { useCase, repository, emailSender } = setup();
    const input = makeSendNotificationInput({
      channels: [Channel.IN_APP],
    });

    await useCase.handle(input);

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('only sends email when channels includes only EMAIL', async () => {
    const { useCase, repository, emailSender } = setup();
    const input = makeSendNotificationInput({
      channels: [Channel.EMAIL],
    });

    await useCase.handle(input);

    expect(repository.save).not.toHaveBeenCalled();
    expect(emailSender.send).toHaveBeenCalledTimes(1);
  });

  it('does nothing if already sent for this request and recipient (idempotency)', async () => {
    const { useCase, repository, emailSender } = setup();
    repository.existsByRequestAndRecipient.mockResolvedValue(true);
    const input = makeSendNotificationInput();

    await useCase.handle(input);

    expect(repository.save).not.toHaveBeenCalled();
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('throws RecipientNotFoundException when recipient does not exist', async () => {
    const { useCase, users, repository, emailSender } = setup();
    users.notificationRecipient.mockResolvedValue(null as any);
    const input = makeSendNotificationInput();

    await expect(useCase.handle(input)).rejects.toThrow(
      RecipientNotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('logs email failure without throwing exception or canceling in-app persistence', async () => {
    const { useCase, repository, emailSender, logError } = setup();
    emailSender.send.mockRejectedValue(new Error('SMTP timeout'));
    const input = makeSendNotificationInput();

    await useCase.handle(input);

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'notification.email_failed',
      }),
    );
  });

  it('validates request payload and throws InvalidNotificationException on invalid payload', async () => {
    const { useCase } = setup();

    await expect(
      useCase.handle(
        makeSendNotificationInput({
          payload: { invalidKey: 'val' },
        }),
      ),
    ).rejects.toThrow(InvalidNotificationException);

    await expect(
      useCase.handle(
        makeSendNotificationInput({
          type: NotificationType.MEMBER_INVITED,
          payload: {}, // missing schoolName
        }),
      ),
    ).rejects.toThrow(InvalidNotificationException);

    await expect(
      useCase.handle(
        makeSendNotificationInput({
          recipientIds: ['not-a-uuid'],
        }),
      ),
    ).rejects.toThrow(InvalidNotificationException);

    await expect(
      useCase.handle(
        makeSendNotificationInput({
          channels: ['INVALID_CHANNEL' as any],
        }),
      ),
    ).rejects.toThrow(InvalidNotificationException);
  });
});

describe('In-app queries and commands', () => {
  it('ListNotifications maps inbox query results', async () => {
    const notif = Notification.create({
      requestId: randomUUID(),
      recipientId: randomUUID(),
      organizationId: null,
      type: NotificationType.WELCOME,
      severity: Severity.INFO,
      title: 'Welcome',
      message: 'Hello',
      payload: {},
      locale: 'fr',
    });

    const repo = {
      findInbox: vi.fn(async () => ({
        items: [notif],
        total: 1,
      })),
    };

    const listQuery = new ListNotifications(repo as any);
    const result = await listQuery.handle({
      recipientId: notif.recipientId,
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Welcome');
    expect(result.items[0].read).toBe(false);
  });

  it('GetNotification returns item or throws NotificationNotFoundException', async () => {
    const recipientId = randomUUID();
    const notifId = randomUUID();
    const notif = Notification.reconstitute({
      id: notifId,
      requestId: randomUUID(),
      recipientId,
      organizationId: null,
      type: NotificationType.WELCOME,
      severity: Severity.INFO,
      title: 'Welcome',
      message: 'Hello',
      payload: {},
      locale: 'fr',
      createdAt: new Date(),
      readAt: null,
    });

    const repo = {
      findByIdForRecipient: vi.fn(async (_id, _recId) =>
        _id === notifId ? notif : null,
      ),
    };

    const getQuery = new GetNotification(repo as any);
    const item = await getQuery.handle(recipientId, notifId);
    expect(item.id).toBe(notifId);

    await expect(
      getQuery.handle(recipientId, randomUUID()),
    ).rejects.toThrow(NotificationNotFoundException);
  });

  it('CountUnreadNotifications delegates to repository', async () => {
    const repo = {
      countUnread: vi.fn(async () => 5),
    };

    const countQuery = new CountUnreadNotifications(repo as any);
    const count = await countQuery.handle('user-id');
    expect(count).toBe(5);
  });

  it('MarkNotificationRead marks single or all notifications', async () => {
    const repo = {
      markRead: vi.fn(async (_userId, notifId) => (notifId ? true : true)),
    };

    const markReadCmd = new MarkNotificationRead(repo as any);
    await expect(
      markReadCmd.handle({ recipientId: 'user-id', id: randomUUID() }),
    ).resolves.toBeUndefined();

    repo.markRead.mockResolvedValueOnce(false);
    await expect(
      markReadCmd.handle({ recipientId: 'user-id', id: randomUUID() }),
    ).rejects.toThrow(NotificationNotFoundException);

    await expect(
      markReadCmd.handle({ recipientId: 'user-id' }),
    ).resolves.toBeUndefined();
  });
});

describe('NotificationListener event handling', () => {
  it('dispatches notifications on domain events', async () => {
    const sendNotification = {
      handle: vi.fn(async () => {}),
    };
    const users = {
      notificationRecipientByEmail: vi.fn(async (email) => ({
        id: randomUUID(),
        email,
      })),
    };

    const listener = new NotificationListener(
      sendNotification as any,
      users as any,
    );

    await listener.created({ subjectId: randomUUID() });
    expect(sendNotification.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.WELCOME,
      }),
    );

    await listener.security({
      eventId: randomUUID(),
      subjectId: randomUUID(),
      status: 'SUSPENDED' as any,
      occurredAt: new Date(),
    });
    expect(sendNotification.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.SECURITY_ALERT,
      }),
    );

    await listener.invited({
      schoolId: randomUUID(),
      schoolName: 'Oxford High',
      email: 'invitee@example.com',
      sentAt: new Date(),
    });
    expect(sendNotification.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.MEMBER_INVITED,
      }),
    );

    await listener.roleChanged({
      eventId: randomUUID(),
      schoolId: randomUUID(),
      schoolName: 'Oxford High',
      recipientIds: [randomUUID()],
    });
    expect(sendNotification.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.MEMBER_ROLE_CHANGED,
      }),
    );

    await listener.joined({
      schoolId: randomUUID(),
      schoolName: 'Oxford High',
      inviterId: randomUUID(),
      acceptedAt: new Date(),
    });
    expect(sendNotification.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.MEMBER_JOINED,
      }),
    );
  });
});

describe('Notification configuration validation', () => {
  it('validates boolean and integer environment variables', () => {
    expect(() => notificationConfig({ EMAIL_ENABLED: 'invalid' })).toThrow();
    expect(() =>
      notificationConfig({ NOTIFICATIONS_ENABLED: 'invalid' }),
    ).toThrow();
    expect(() =>
      notificationConfig({ NOTIFICATIONS_DEFAULT_LOCALE: 'es' }),
    ).toThrow();
    expect(() =>
      notificationConfig({
        EMAIL_ENABLED: 'true',
        SMTP_HOST: '',
      }),
    ).toThrow();
  });
});
