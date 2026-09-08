import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fork, type ChildProcess } from 'node:child_process';
import ts from 'typescript';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { SqliteDatabase } from '../src/shared/infrastructure/database/sqlite.database.js';
import { PUserRepository } from '../src/modules/user/infrastructure/persistence/repositories/p-user.repository.js';
import { User } from '../src/modules/user/domain/entities/user.enity.js';
import { GlobalRole } from '../src/modules/user/domain/enum/global-role.enum.js';
import UserStatus from '../src/modules/user/domain/enum/user-status.enum.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../src/modules/user/domain/repositories/i-user.repository.js';
import {
  AUTH_IDENTITY_REPOSITORY,
  type AuthIdentityRepository,
} from '../src/modules/auth/domain/repositories/auth-identity.repositories.js';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from '../src/modules/auth/domain/repositories/session.repositories.js';
import { AuthProvider } from '../src/modules/auth/domain/enums/auth-provider.enums.js';
import { EmailLoginUseCase } from '../src/modules/auth/application/use-cases/email-login.usecase.js';
import { AuthenticateUseCase } from '../src/modules/auth/application/use-cases/authenticate.usecase.js';
import { RefreshTokenUseCase } from '../src/modules/auth/application/use-cases/refresh-token.usecase.js';
import { LogoutUseCase } from '../src/modules/auth/application/use-cases/logout.usecase.js';

let directory: string;
let databasePath: string;
const apps: INestApplication[] = [];
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'sys10-'));
  databasePath = join(directory, 'application.sqlite');
  vi.stubEnv('DATABASE_PATH', databasePath);
  vi.stubEnv('JWT_SECRET', 'test-only-secret-with-at-least-32-bytes');
  vi.stubEnv('JWT_ISSUER', 'about-us');
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');
  vi.stubEnv(
    'GOOGLE_CALLBACK_URL',
    'http://localhost:3000/auth/google/callback',
  );
});
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

async function boot(options: { email?: string; password?: string } = {}) {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => ({ 'super-admin': options })],
      }),
      AuthModule,
    ],
  }).compile();
  const app = module.createNestApplication();
  app.useLogger(false);
  apps.push(app);
  await app.init();
  return app;
}
async function stop(app: INestApplication) {
  await app.close();
  apps.splice(apps.indexOf(app), 1);
}
function count(database: SqliteDatabase, table: 'users' | 'auth_identities') {
  return database.connection
    .prepare(`SELECT count(*) AS count FROM ${table}`)
    .get()?.count;
}

describe('SYS 1.0 durable initialization (audit excluded)', () => {
  it('preserves the role, credentials and sessions across restarts even when configuration changes or disappears', async () => {
    const password = 'Initial-password-2026!';
    let app = await boot({ email: 'first@example.com', password });
    const admin = (await app
      .get<UserRepository>(USER_REPOSITORY)
      .findSuperAdmin())!;
    expect(admin.globalRole).toBe(GlobalRole.SUPER_ADMIN);
    expect(admin.status).toBe(UserStatus.ACTIVE);
    const identity = (await app
      .get<AuthIdentityRepository>(AUTH_IDENTITY_REPOSITORY)
      .findByProvider(AuthProvider.EMAIL, admin.email))!;
    const hash = identity.toPrimitives().passwordHash!;
    expect(await bcrypt.compare(password, hash)).toBe(true);
    const tokens = await app
      .get(EmailLoginUseCase)
      .handle({ email: admin.email, password });
    const principal = await app
      .get(AuthenticateUseCase)
      .handle(tokens.accessToken);
    await stop(app);
    expect(readFileSync(databasePath).includes(Buffer.from(password))).toBe(
      false,
    );

    for (const options of [
      { email: 'changed@example.com', password: 'Changed-password!' },
      {},
    ]) {
      app = await boot(options);
      const users = app.get<UserRepository>(USER_REPOSITORY);
      expect((await users.findSuperAdmin())?.id).toBe(admin.id);
      expect(await users.findByEmail('changed@example.com')).toBeNull();
      const savedIdentity = (await app
        .get<AuthIdentityRepository>(AUTH_IDENTITY_REPOSITORY)
        .findById(identity.id))!;
      expect(savedIdentity.toPrimitives().passwordHash).toBe(hash);
      expect(count(app.get(SqliteDatabase), 'users')).toBe(1);
      expect(count(app.get(SqliteDatabase), 'auth_identities')).toBe(1);
      expect(
        await app.get(AuthenticateUseCase).handle(tokens.accessToken),
      ).toEqual(principal);
      await app.get(EmailLoginUseCase).handle({ email: admin.email, password });
      await stop(app);
    }
    app = await boot();
    const sessions = app.get<SessionRepository>(SESSION_REPOSITORY);
    const stale = (await sessions.findById(principal.sessionId))!;
    await app.get(LogoutUseCase).handle(tokens.accessToken);
    stale.touch();
    await sessions.save(stale);
    await stop(app);
    app = await boot();
    await expect(
      app.get(RefreshTokenUseCase).handle(tokens.refreshToken),
    ).rejects.toThrow('Session unavailable');
  });

  it('never promotes an ordinary account that occupies the configured email', async () => {
    const database = new SqliteDatabase(databasePath);
    const users = new PUserRepository(database);
    const ordinary = await users.save(
      User.create({ email: 'occupied@example.com' }),
    );
    database.close();
    await expect(
      boot({ email: 'OCCUPIED@example.com', password: 'Configured-password!' }),
    ).rejects.toThrow('already used by an ordinary account');
    const check = new SqliteDatabase(databasePath);
    try {
      expect(
        (await new PUserRepository(check).findById(ordinary.id!))?.globalRole,
      ).toBe(GlobalRole.USER);
      expect(count(check, 'users')).toBe(1);
      expect(count(check, 'auth_identities')).toBe(0);
    } finally {
      check.close();
    }
  });

  it('rejects missing first-run configuration and repairs interrupted identity creation on the next startup', async () => {
    await expect(boot()).rejects.toThrow('SUPER_ADMIN_EMAIL');
    await expect(boot({ email: 'admin@example.com' })).rejects.toThrow(
      'SUPER_ADMIN_PASSWORD',
    );
    const database = new SqliteDatabase(databasePath);
    const before = (await new PUserRepository(database).findSuperAdmin())!;
    expect(count(database, 'users')).toBe(1);
    expect(count(database, 'auth_identities')).toBe(0);
    database.close();
    const app = await boot({
      email: 'ignored@example.com',
      password: 'Repair-password!',
    });
    expect(
      (await app.get<UserRepository>(USER_REPOSITORY).findSuperAdmin())?.id,
    ).toBe(before.id);
    expect(count(app.get(SqliteDatabase), 'users')).toBe(1);
    expect(count(app.get(SqliteDatabase), 'auth_identities')).toBe(1);
    await app
      .get(EmailLoginUseCase)
      .handle({ email: before.email, password: 'Repair-password!' });
  });

  it('recognizes a suspended SUPER_ADMIN and does not create or activate another account', async () => {
    let app = await boot({
      email: 'admin@example.com',
      password: 'Configured-password!',
    });
    const users = app.get<UserRepository>(USER_REPOSITORY);
    const admin = (await users.findSuperAdmin())!;
    admin.block();
    await users.save(admin);
    await stop(app);
    app = await boot({ email: 'other@example.com' });
    expect(
      (await app.get<UserRepository>(USER_REPOSITORY).findSuperAdmin())?.status,
    ).toBe(UserStatus.SUSPENDED);
    expect(count(app.get(SqliteDatabase), 'users')).toBe(1);
    await expect(
      app
        .get(EmailLoginUseCase)
        .handle({ email: admin.email, password: 'Configured-password!' }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('creates one user and one EMAIL identity when four separate processes initialize the same database', async () => {
    const compiled = join(directory, 'compiled');
    const roots = [
      'shared/infrastructure/database/sqlite.database.ts',
      'modules/user/infrastructure/persistence/repositories/p-user.repository.ts',
      'modules/auth/infrastructure/persistence/sqlite-auth-identity.repository.ts',
      'modules/user/application/use-cases/create-super-admin/create-super-admin.usecase.ts',
      'modules/auth/application/use-cases/create-super-admin-identity.usecase.ts',
      'modules/user/infrastructure/events/in-memory-super-admin-events.gateway.ts',
    ].map((path) => resolve('src', path));
    const program = ts.createProgram(roots, {
      rootDir: resolve('src'),
      outDir: compiled,
      target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      skipLibCheck: true,
      types: ['node'],
      esModuleInterop: true,
    });
    expect(
      ts
        .getPreEmitDiagnostics(program)
        .map((value) =>
          ts.flattenDiagnosticMessageText(value.messageText, '\n'),
        ),
    ).toEqual([]);
    expect(program.emit().emitSkipped).toBe(false);
    writeFileSync(join(compiled, 'package.json'), '{"type":"module"}');
    const children: ChildProcess[] = [];
    let ready = 0;
    try {
      const results = await Promise.all(
        Array.from(
          { length: 4 },
          (_, index) =>
            new Promise<{ userId: string; identityId: string; hash: string }>(
              (resolveResult, reject) => {
                const child = fork(
                  resolve('test/fixtures/sys10-worker.mjs'),
                  [
                    compiled,
                    databasePath,
                    import.meta.resolve('bcrypt'),
                    String(index),
                  ],
                  { execArgv: [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] },
                );
                children.push(child);
                let stderr = '';
                child.stderr?.on('data', (chunk) => {
                  stderr += chunk;
                });
                child.on('error', reject);
                child.on('exit', (code) => {
                  if (code !== 0)
                    reject(new Error(`Bootstrap process failed: ${stderr}`));
                });
                child.on(
                  'message',
                  (message: {
                    type: string;
                    userId: string;
                    identityId: string;
                    hash: string;
                    message: string;
                  }) => {
                    if (message.type === 'ready') {
                      ready += 1;
                      if (ready === 4)
                        for (const worker of children) worker.send('start');
                    }
                    if (message.type === 'result') resolveResult(message);
                    if (message.type === 'failure')
                      reject(new Error(message.message));
                  },
                );
              },
            ),
        ),
      );
      expect(new Set(results.map((value) => value.userId)).size).toBe(1);
      expect(new Set(results.map((value) => value.identityId)).size).toBe(1);
      expect(new Set(results.map((value) => value.hash)).size).toBe(1);
      expect(
        await bcrypt.compare('Concurrent-password!', results[0].hash),
      ).toBe(true);
      const database = new SqliteDatabase(databasePath);
      try {
        expect(count(database, 'users')).toBe(1);
        expect(count(database, 'auth_identities')).toBe(1);
      } finally {
        database.close();
      }
    } finally {
      for (const child of children) if (child.exitCode === null) child.kill();
    }
  }, 30000);
});
