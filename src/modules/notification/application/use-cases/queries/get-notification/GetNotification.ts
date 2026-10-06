import type { UUID } from 'node:crypto';
import type { NotificationRepository } from '../../../../domain/repositories/i-notification.repository.js';
import { NotificationNotFoundException } from '../../../../domain/exceptions/notification-not-found.exception.js';
import { toNotificationItem } from '../list-notifications/to-notification-item.js';
import type { NotificationItemOutput } from '../list-notifications/ListNotificationsOutput.js';

export class GetNotification {
  constructor(private readonly notifications: NotificationRepository) {}

  async handle(
    recipientId: string,
    id: UUID,
  ): Promise<NotificationItemOutput> {
    const notification = await this.notifications.findByIdForRecipient(
      id,
      recipientId,
    );
    if (!notification) throw new NotificationNotFoundException();
    return toNotificationItem(notification);
  }
}
