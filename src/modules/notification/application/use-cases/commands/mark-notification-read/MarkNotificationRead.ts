import type { MarkNotificationReadInput } from './MarkNotificationReadInput.js';
import type { NotificationRepository } from '../../../../domain/repositories/i-notification.repository.js';
import { NotificationNotFoundException } from '../../../../domain/exceptions/notification-not-found.exception.js';

export class MarkNotificationRead {
  constructor(private readonly notifications: NotificationRepository) {}

  async handle(input: MarkNotificationReadInput): Promise<void> {
    const found = await this.notifications.markRead(
      input.recipientId,
      input.id,
    );
    if (input.id && !found) throw new NotificationNotFoundException();
  }
}
