import { NotificationType } from '../../domain/enums/notification-type.enum.js';
import {
  interpolate,
  resolveLocale,
  type NotificationTemplates,
  type RenderedNotification,
} from '../../application/gateways/i-notification-templates.gateway.js';

const catalog = {
  fr: {
    [NotificationType.WELCOME]: [
      'Bienvenue sur About Us',
      'Votre compte About Us est prêt.',
    ],
    [NotificationType.MEMBER_INVITED]: [
      'Invitation à une école',
      'Vous êtes invité à rejoindre « {schoolName} ». Connectez-vous à About Us pour consulter votre invitation.',
    ],
    [NotificationType.MEMBER_ROLE_CHANGED]: [
      'Rôle modifié',
      'Votre rôle dans « {schoolName} » a été modifié. Consultez votre espace pour connaître vos accès.',
    ],
    [NotificationType.MEMBER_JOINED]: [
      'Invitation acceptée',
      'Un administrateur a rejoint « {schoolName} ».',
    ],
    [NotificationType.SECURITY_ALERT]: [
      'Alerte de sécurité',
      'Le statut de votre compte a été modifié. Consultez votre administrateur pour plus de détails.',
    ],
  },
  en: {
    [NotificationType.WELCOME]: [
      'Welcome to About Us',
      'Your About Us account is ready.',
    ],
    [NotificationType.MEMBER_INVITED]: [
      'School invitation',
      'You are invited to join “{schoolName}”. Sign in to About Us to view your invitation.',
    ],
    [NotificationType.MEMBER_ROLE_CHANGED]: [
      'Role changed',
      'Your role in “{schoolName}” has changed. Open your workspace to review your access.',
    ],
    [NotificationType.MEMBER_JOINED]: [
      'Invitation accepted',
      'An administrator joined “{schoolName}”.',
    ],
    [NotificationType.SECURITY_ALERT]: [
      'Security alert',
      'Your account status has changed. Contact your administrator for more information.',
    ],
  },
} as const;

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
}

export class CatalogNotificationTemplates implements NotificationTemplates {
  constructor(private readonly defaultLocale = 'fr') {}

  resolveLocale(
    ...candidates: (string | null | undefined)[]
  ): 'fr' | 'en' {
    return resolveLocale(...candidates, this.defaultLocale);
  }

  render(
    type: NotificationType,
    locale: string,
    payload: Record<string, unknown>,
  ): RenderedNotification {
    const resolved = this.resolveLocale(locale);
    const template = catalog[resolved][type];
    const [title, message] = template.map((text) => interpolate(text, payload));
    return {
      title,
      message,
      html: `<html lang="${resolved}"><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></body></html>`,
    };
  }
}
