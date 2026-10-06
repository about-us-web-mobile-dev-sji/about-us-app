import { registerAs } from '@nestjs/config';
export default registerAs('auth', () => ({
  secret: process.env.JWT_SECRET,
  issuer: process.env.JWT_ISSUER || 'about-us',
  webOrigin: new URL(process.env.AUTH_WEB_ORIGIN || 'http://localhost:4200')
    .origin,
  webCallbackUrl: new URL(
    '/auth/callback',
    process.env.AUTH_WEB_ORIGIN || 'http://localhost:4200',
  ).href,
  accessTtlSeconds: 900,
  sessionTtlSeconds: 7 * 24 * 60 * 60,
}));
