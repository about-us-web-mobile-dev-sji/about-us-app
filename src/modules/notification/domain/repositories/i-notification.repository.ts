import type { Notification } from '../entities/notification.entity.js';
import type { NotificationType } from '../enums/notification-type.enum.js';
import type { UUID } from 'node:crypto';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationListQuery {
  page: number;
  limit: number;
  read?: boolean;
  type?: NotificationType;
}

export interface NotificationRepository {
  existsByRequestAndRecipient(
    requestId: string,
    recipientId: string,
  ): Promise<boolean>;
  save(notification: Notification): Promise<Notification>;
  findByIdForRecipient(
    id: UUID,
    recipientId: string,
  ): Promise<Notification | null>;
  findInbox(
    recipientId: string,
    query: NotificationListQuery,
  ): Promise<{ items: Notification[]; total: number }>;
  countUnread(recipientId: string): Promise<number>;
  markRead(recipientId: string, id?: UUID): Promise<boolean>;
}
