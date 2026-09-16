import type { NotificationType } from '../../../../domain/enums/notification-type.enum.js';
import type { Severity } from '../../../../domain/enums/severity.enum.js';

export interface NotificationItemOutput {
  id: string;
  type: NotificationType;
  severity: Severity;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  locale: string;
  organizationId: string | null;
  read: boolean;
  createdAt: string;
}

export interface ListNotificationsOutput {
  items: NotificationItemOutput[];
  total: number;
}
