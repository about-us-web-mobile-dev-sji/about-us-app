import { createTestDatabase } from '../src/test/postgres-test-utils.js';
import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

describe.skipIf(!process.env.TEST_DATABASE_URL)('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    database = await createTestDatabase();
    vi.stubEnv('EMAIL_ENABLED', 'false');
    vi.stubEnv('NOTIFICATIONS_ENABLED', 'true');
    vi.stubEnv('DATABASE_TYPE', 'postgres');
    vi.stubEnv('DATABASE_SYNCHRONIZE', 'true');
    vi.stubEnv('DATABASE_HOST', database.connection.host);
    vi.stubEnv('DATABASE_PORT', String(database.connection.port));
    vi.stubEnv('DATABASE_USERNAME', database.connection.username);
    vi.stubEnv('DATABASE_PASSWORD', database.connection.password);
    vi.stubEnv('DATABASE_NAME', database.connection.database);
    vi.stubEnv('SUPER_ADMIN_EMAIL', 'admin@example.com');
    vi.stubEnv('SUPER_ADMIN_PASSWORD', 'Test-admin-password-2026!');
    vi.stubEnv('JWT_SECRET', 'test-only-secret-with-at-least-32-bytes');
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');
    vi.stubEnv(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:3000/auth/web/google/callback',
    );
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('loads the database configuration from the environment', () => {
    expect(app.get(ConfigService).get('database')).toEqual({
      type: 'postgres',
      host: database.connection.host,
      port: database.connection.port,
      username: database.connection.username,
      password: database.connection.password,
      database: database.connection.database,
      synchronize: true,
    });
  });

  it('serves persisted notifications through the real authentication guard', async () => {
    await request(app.getHttpServer()).get('/notifications').expect(401);
    const login = await request(app.getHttpServer())
      .post('/auth/mobile/login/email')
      .send({
        email: 'admin@example.com',
        password: 'Test-admin-password-2026!',
      })
      .expect(200);
    const authorization = `Bearer ${login.body.accessToken}`;
    const notifications = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', authorization)
      .expect(200);
    expect(
      notifications.body.items.some(
        (item: { type: string }) => item.type === 'WELCOME',
      ),
    ).toBe(true);
    await request(app.getHttpServer())
      .patch('/notifications/read-all')
      .set('Authorization', authorization)
      .expect(204);
    const count = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Authorization', authorization)
      .expect(200);
    expect(count.body.count).toBe(0);
  });

  afterEach(async () => {
    await app?.close();
    await database?.cleanup();
    vi.unstubAllEnvs();
  });
});
