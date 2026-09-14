import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const type = process.env.DATABASE_TYPE ?? 'postgres';
  if (type !== 'postgres' && type !== 'sqlite') throw new Error('DATABASE_TYPE must be postgres or sqlite');
  
  const rawPort = process.env.DATABASE_PORT ?? process.env.DB_PORT ?? '5432';
  if (!/^\d+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535)
    throw new Error('DATABASE_PORT must be an integer between 1 and 65535');
  
  const sync =
    process.env.DATABASE_SYNCHRONIZE ??
    process.env.DB_SYNCHRONIZE ??
    (process.env.NODE_ENV === 'production' ? 'false' : 'true');
  if (!['true', 'false'].includes(sync))
    throw new Error('DATABASE_SYNCHRONIZE must be true or false');

  return {
    type: type as any,
    host: process.env.DATABASE_HOST ?? process.env.DB_HOST ?? 'localhost',
    port: Number(rawPort),
    username:
      process.env.DATABASE_USERNAME ?? process.env.DB_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? process.env.DB_PASS,
    database: process.env.DATABASE_NAME ?? process.env.DB_NAME ?? 'about_us', // Remplacé 'name' par 'database'
    synchronize: sync === 'true',
  };
});