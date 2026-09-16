export const NOTIFICATION_CONFIG = Symbol('NOTIFICATION_CONFIG');

export interface NotificationConfig {
  enabled: boolean;
  defaultLocale: string;
  emailEnabled: boolean;
  from: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser?: string;
  smtpPassword?: string;
}

export function notificationConfig(
  env: NodeJS.ProcessEnv = process.env,
): NotificationConfig {
  const bool = (key: string, fallback: string) => {
    const value = env[key] ?? fallback;
    if (!['true', 'false'].includes(value)) {
      throw new Error(`${key} must be true or false`);
    }
    return value === 'true';
  };
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const raw = env[key] ?? String(fallback);
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || value < min || value > max) {
      throw new Error(`Invalid ${key}`);
    }
    return value;
  };

  const language = env.NOTIFICATIONS_DEFAULT_LOCALE ?? 'fr';
  if (!['fr', 'en'].includes(language)) {
    throw new Error('Invalid NOTIFICATIONS_DEFAULT_LOCALE');
  }

  const emailEnabled = bool('EMAIL_ENABLED', 'false');
  const from = env.EMAIL_FROM_ADDRESS ?? '';
  const smtpHost = env.SMTP_HOST ?? '';
  if (
    emailEnabled &&
    (!smtpHost || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from))
  ) {
    throw new Error('SMTP_HOST and valid EMAIL_FROM_ADDRESS are required');
  }
  if (!!env.SMTP_USER !== !!env.SMTP_PASSWORD) {
    throw new Error('SMTP_USER and SMTP_PASSWORD must be configured together');
  }

  return {
    enabled: bool('NOTIFICATIONS_ENABLED', 'true'),
    defaultLocale: language,
    emailEnabled,
    from,
    smtpHost,
    smtpPort: integer('SMTP_PORT', 587, 1, 65535),
    smtpSecure: bool('SMTP_SECURE', 'false'),
    smtpUser: env.SMTP_USER,
    smtpPassword: env.SMTP_PASSWORD,
  };
}
