import type { Notification } from '../../../../domain/entities/notification.entity.js';
import type { NotificationItemOutput } from './ListNotificationsOutput.js';

export function toNotificationItem(notification: Notification): NotificationItemOutput {
  const primitives = notification.toPrimitives();
  return {
    id: primitives.id!,
    type: primitives.type,
    severity: primitives.severity,
    title: primitives.title,
    message: primitives.message,
    payload: primitives.payload,
    locale: primitives.locale,
    organizationId: primitives.organizationId,
    read: primitives.readAt != null,
    createdAt: primitives.createdAt.toISOString(),
  };
}
