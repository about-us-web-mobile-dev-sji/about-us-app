import type { NotificationRepository } from '../../../../domain/repositories/i-notification.repository.js';

export class CountUnreadNotifications {
  constructor(private readonly notifications: NotificationRepository) {}

  handle(recipientId: string): Promise<number> {
    return this.notifications.countUnread(recipientId);
  }
}
