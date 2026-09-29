import { NotificationType } from '../../../../domain/enums/notification-type.enum.js';
import { Channel } from '../../../../domain/enums/channel.enum.js';

export interface SendNotificationInput {
  requestId: string;
  type: NotificationType;
  recipientIds: string[];
  organizationId?: string | null;
  locale?: string | null;
  payload: Record<string, unknown>;
  channels?: Channel[];
}
