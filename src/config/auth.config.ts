import { registerAs } from '@nestjs/config';
export default registerAs('auth', () => ({
  secret: process.env.JWT_SECRET,
  issuer: process.env.JWT_ISSUER || 'about-us',
  accessTtlSeconds: 900,
  sessionTtlSeconds: 7 * 24 * 60 * 60,
}));
