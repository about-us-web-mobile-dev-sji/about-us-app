import { registerAs } from '@nestjs/config';

/**
 * Path under which browsers reach this API when it sits behind a proxy (e.g.
 * Vercel serving it at https://front/api). Path-scoped cookies must use the
 * path the browser sees. "" when the API is reached directly.
 */
function publicPathPrefix(raw = ''): string {
  const prefix = raw.trim().replace(/\/+$/, '');
  if (prefix && !/^(\/[A-Za-z0-9._-]+)+$/.test(prefix))
    throw new Error('AUTH_PUBLIC_PATH_PREFIX must look like /api');
  return prefix;
}
export default registerAs('auth', () => ({
  secret: process.env.JWT_SECRET,
  issuer: process.env.JWT_ISSUER || 'about-us',
  webOrigin: new URL(process.env.AUTH_WEB_ORIGIN || 'http://localhost:4200')
    .origin,
  webCallbackUrl: new URL(
    '/auth/callback',
    process.env.AUTH_WEB_ORIGIN || 'http://localhost:4200',
  ).href,
  publicPathPrefix: publicPathPrefix(process.env.AUTH_PUBLIC_PATH_PREFIX),
  accessTtlSeconds: 900,
  sessionTtlSeconds: 7 * 24 * 60 * 60,
}));
