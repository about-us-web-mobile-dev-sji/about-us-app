import { NotificationType } from '../../domain/enums/notification-type.enum.js';
import { InvalidNotificationException } from '../../domain/exceptions/invalid-notification.exception.js';

export const NOTIFICATION_TEMPLATES = Symbol('NOTIFICATION_TEMPLATES');

export interface RenderedNotification {
  title: string;
  message: string;
  html: string;
}

export interface NotificationTemplates {
  resolveLocale(...candidates: (string | null | undefined)[]): 'fr' | 'en';
  render(
    type: NotificationType,
    locale: string,
    payload: Record<string, unknown>,
  ): RenderedNotification;
}

export function resolveLocale(
  ...candidates: (string | null | undefined)[]
): 'fr' | 'en' {
  for (const candidate of candidates) {
    const normalized = candidate?.toLowerCase().split(/[-_]/)[0];
    if (normalized === 'fr' || normalized === 'en') return normalized;
  }
  return 'fr';
}

export function interpolate(
  text: string,
  payload: Record<string, unknown>,
): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (typeof payload[key] !== 'string') {
      throw new InvalidNotificationException('Missing template variable');
    }
    return payload[key];
  });
}
