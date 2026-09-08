import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { UserEntity } from '../modules/user-off/infrastructure/persistence/typeorm/user.entity.js';
import { AuthIdentityEntity } from '../modules/auth/infrastructure/persistence/typeorm/auth-identity.entity.js';
import { AuthSessionEntity } from '../modules/auth/infrastructure/persistence/typeorm/auth-session.entity.js';
/** TEST_DATABASE_URL must identify a test server with CREATE DATABASE permission.
 * Only the randomly named database created here is removed by cleanup(). */
export async function createTestDatabase() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url)
    throw new Error(
      'TEST_DATABASE_URL is required for PostgreSQL integration tests',
    );
  const admin = new DataSource({ type: 'postgres', url });
  await admin.initialize();
  const name = `about_us_test_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE DATABASE "${name}"`);
  const parsed = new URL(url);
  const connection = {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: name,
  };
  const source = new DataSource({
    type: 'postgres',
    ...connection,
    synchronize: false,
    entities: [UserEntity, AuthIdentityEntity, AuthSessionEntity],
  });
  const cleanup = async () => {
    if (source.isInitialized) await source.destroy();
    try {
      await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    } finally {
      await admin.destroy();
    }
  };
  try {
    await source.initialize();
    await source.query('CREATE SCHEMA IF NOT EXISTS auth');
    await source.query('CREATE SCHEMA IF NOT EXISTS "user"');
    await source.synchronize();
  } catch (error) {
    await cleanup();
    throw error;
  }
  return { source, connection, cleanup };
}
