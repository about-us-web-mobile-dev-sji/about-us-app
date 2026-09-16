import type { NotificationType } from '../../../../domain/enums/notification-type.enum.js';

export interface ListNotificationsInput {
  recipientId: string;
  page: number;
  limit: number;
  read?: boolean;
  type?: NotificationType;
}
