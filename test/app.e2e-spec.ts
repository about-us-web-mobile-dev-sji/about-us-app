import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    vi.stubEnv('DATABASE_PATH', ':memory:');
    vi.stubEnv('DATABASE_TYPE', 'mysql');
    vi.stubEnv('DATABASE_HOST', 'test-db');
    vi.stubEnv('DATABASE_PORT', '3307');
    vi.stubEnv('DATABASE_USERNAME', 'test-user');
    vi.stubEnv('DATABASE_PASSWORD', 'test-password');
    vi.stubEnv('DATABASE_NAME', 'test-database');
    vi.stubEnv('SUPER_ADMIN_EMAIL', 'admin@example.com');
    vi.stubEnv('SUPER_ADMIN_PASSWORD', 'Test-admin-password-2026!');
    vi.stubEnv('JWT_SECRET', 'test-only-secret-with-at-least-32-bytes');
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');
    vi.stubEnv(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:3000/auth/google/callback',
    );
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // App wiring test: no external MySQL server is required.
      .overrideProvider(DataSource)
      .useValue({ isInitialized: false, manager: {} })
      .compile();

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
      type: 'mysql',
      host: 'test-db',
      port: 3307,
      username: 'test-user',
      password: 'test-password',
      name: 'test-database',
    });
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });
});
