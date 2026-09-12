import { registerAs } from '@nestjs/config';

export default registerAs('google', () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  audiences: (
    process.env.GOOGLE_ALLOWED_AUDIENCES ||
    process.env.GOOGLE_CLIENT_ID ||
    ''
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackUrl: process.env.GOOGLE_CALLBACK_URL,
}));
