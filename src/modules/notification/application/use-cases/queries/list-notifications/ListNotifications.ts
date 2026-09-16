import type { ListNotificationsInput } from './ListNotificationsInput.js';
import type { ListNotificationsOutput } from './ListNotificationsOutput.js';
import type { NotificationRepository } from '../../../../domain/repositories/i-notification.repository.js';
import { toNotificationItem } from './to-notification-item.js';

export class ListNotifications {
  constructor(private readonly notifications: NotificationRepository) {}

  async handle(input: ListNotificationsInput): Promise<ListNotificationsOutput> {
    const result = await this.notifications.findInbox(input.recipientId, {
      page: input.page,
      limit: input.limit,
      read: input.read,
      type: input.type,
    });
    return {
      items: result.items.map(toNotificationItem),
      total: result.total,
    };
  }
}
