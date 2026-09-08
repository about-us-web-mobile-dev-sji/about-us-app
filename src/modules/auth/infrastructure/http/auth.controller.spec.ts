import { User } from '../../../user/domain/entities/user.enity.js';
import {
  PASSWORD_ENCRYPTION,
  type PasswordEncryptionGateway,
} from '../../application/gateways/i-password-encryption.gateway.js';
import { AuthIdentity } from '../../domain/entities/auth-identity.js';
import { Session } from '../../domain/entities/session.js';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from '../../domain/repositories/session.repositories.js';
import { AuthenticateUseCase } from '../../application/use-cases/authenticate.usecase.js';
import { InvalidSessionException } from '../../domain/exceptions/invalid-session.exception.js';
import { AccountUnavailableException } from '../../domain/exceptions/account-unavailable.exception.js';
import { InvalidGoogleIdentityException } from '../../domain/exceptions/invalid-google-identity.exception.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AuthModule } from '../../auth.module.js';
import { GoogleStrategy } from '../services/google.strategy.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../user/domain/repositories/i-user.repository.js';
import {
  AUTH_IDENTITY_REPOSITORY,
  type AuthIdentityRepository,
} from '../../domain/repositories/auth-identity.repositories.js';
import { AuthProvider } from '../../domain/enums/auth-provider.enums.js';

describe('Google authentication HTTP flow', () => {
  let app: INestApplication;
  let exchange: ReturnType<typeof vi.fn>;
  let profile: ReturnType<typeof vi.fn<GoogleStrategy['userProfile']>>;
  beforeEach(async () => {
    vi.stubEnv('DATABASE_PATH', ':memory:');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('JWT_ISSUER', 'about-us');
    vi.stubEnv('JWT_SECRET', 'test-only-secret-with-at-least-32-bytes');
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');
    vi.stubEnv(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:3000/auth/google/callback',
    );
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              'super-admin': {
                email: 'admin@example.com',
                password: 'Test-admin-password-2026!',
              },
            }),
          ],
        }),
        AuthModule,
      ],
    }).compile();
    const strategy = module.get(GoogleStrategy);
    // Replace only Google's external calls; exercise real Passport, state store, Nest DI and JWTs.
    exchange = vi.fn((_code, _options, done) =>
      done(null, 'google-access', undefined, {}),
    );
    const oauth = strategy as unknown as {
      _oauth2: { getOAuthAccessToken: typeof exchange };
    };
    oauth._oauth2.getOAuthAccessToken = exchange;
    profile = vi.fn((_token, done) =>
      done(null, {
        provider: 'google',
        id: 'google-sub',
        displayName: 'Alice',
        emails: [{ value: 'new@example.com', verified: true }],
        name: { givenName: 'Alice', familyName: 'Doe' },
      }),
    );
    strategy.userProfile = profile;
    app = module.createNestApplication();
    await app.init();
    await app
      .get<UserRepository>(USER_REPOSITORY)
      .save(User.create({ email: 'alice@example.com' }));
    await app.listen(0, '127.0.0.1');
  });
  afterEach(async () => {
    await app?.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function login() {
    const browser = request.agent(app.getHttpServer());
    const start = await browser.get('/auth/google').expect(302);
    const url = new URL(start.headers.location);
    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe('test-client');
    expect(url.searchParams.get('scope')).toContain('email');
    const state = url.searchParams.get('state')!;
    const response = await browser
      .get('/auth/google/callback')
      .query({ code: 'test-code', state })
      .expect(200);
    return { browser, state, response };
  }

  it('logs in, reuses the identity, refreshes and revokes the entire session', async () => {
    const { response } = await login();
    expect(response.headers['cache-control']).toBe('no-store');
    const { accessToken, refreshToken } = response.body;
    expect(refreshToken).toEqual(expect.any(String));
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .auth(accessToken, { type: 'bearer' })
      .expect(200);
    const again = await login();
    const second = await request(app.getHttpServer())
      .get('/auth/me')
      .auth(again.response.body.accessToken, { type: 'bearer' })
      .expect(200);
    expect(second.body.subjectId).toBe(me.body.subjectId);
    expect(second.body.sessionId).not.toBe(me.body.sessionId);
    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(accessToken, { type: 'bearer' })
      .expect(204);
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(refreshed.body.accessToken, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(again.response.body.accessToken, { type: 'bearer' })
      .expect(200);
  });

  it('rejects missing, forged, cross-browser and reused OAuth state before contacting Google', async () => {
    await request(app.getHttpServer())
      .get('/auth/google/callback?code=x')
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/google/callback?code=x&state=forged')
      .expect(401);
    expect(exchange).not.toHaveBeenCalled();
    const { browser, state } = await login();
    exchange.mockClear();
    await browser
      .get('/auth/google/callback')
      .query({ code: 'x', state })
      .expect(401);
    const start = await browser.get('/auth/google').expect(302);
    await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({
        code: 'x',
        state: new URL(start.headers.location).searchParams.get('state'),
      })
      .expect(401);
    expect(exchange).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens and access/refresh token substitution', async () => {
    const { response } = await login();
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: response.body.accessToken })
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(response.body.refreshToken, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth('invalid', { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({})
      .expect(400);
    const jwt = app.get(JwtService);
    const claims = jwt.decode(response.body.accessToken);
    for (const override of [
      { exp: 1, iat: 0 },
      { iss: 'another-issuer' },
      { sid: 'unknown' },
      { sub: 'another-user' },
      { exp: undefined },
    ]) {
      const payload = { ...claims, ...override };
      if (payload.exp === undefined) delete payload.exp;
      const token = jwt.sign(payload);
      await request(app.getHttpServer())
        .get('/auth/me')
        .auth(token, { type: 'bearer' })
        .expect(401);
    }
  });

  it('rejects existing email accounts instead of implicitly linking them', async () => {
    profile.mockImplementation((_token, done) =>
      done(null, {
        provider: 'google',
        id: 'another-sub',
        emails: [{ value: 'alice@example.com', verified: true }],
      }),
    );
    const browser = request.agent(app.getHttpServer());
    const start = await browser.get('/auth/google').expect(302);
    await browser
      .get('/auth/google/callback')
      .query({
        code: 'x',
        state: new URL(start.headers.location).searchParams.get('state'),
      })
      .expect(409);
  });

  it('rejects suspended users both at login and when using existing tokens', async () => {
    const { response } = await login();
    const { sub } = app.get(JwtService).decode(response.body.accessToken);
    const users = app.get<UserRepository>(USER_REPOSITORY);
    const user = (await users.findById(sub))!;
    user.block();
    await users.save(user);
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(response.body.accessToken, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: response.body.refreshToken })
      .expect(401);
    const browser = request.agent(app.getHttpServer());
    const start = await browser.get('/auth/google').expect(302);
    await browser
      .get('/auth/google/callback')
      .query({
        code: 'x',
        state: new URL(start.headers.location).searchParams.get('state'),
      })
      .expect(401);
    const identities = app.get<AuthIdentityRepository>(
      AUTH_IDENTITY_REPOSITORY,
    );
    expect(
      (await identities.findByProvider(AuthProvider.GOOGLE, 'google-sub'))
        ?.subjectId,
    ).toBe(sub);
  });

  it('rejects unverified Google email and denied consent', async () => {
    profile.mockImplementation((_token, done) =>
      done(null, {
        provider: 'google',
        id: 'sub',
        emails: [{ value: 'new@example.com', verified: false }],
      }),
    );
    const browser = request.agent(app.getHttpServer());
    const start = await browser.get('/auth/google').expect(302);
    await browser
      .get('/auth/google/callback')
      .query({
        code: 'x',
        state: new URL(start.headers.location).searchParams.get('state'),
      })
      .expect(401);
    await browser.get('/auth/google/callback?error=access_denied').expect(401);
  });
  it.each([
    [new InvalidSessionException(), 'Session unavailable'],
    [new AccountUnavailableException(), 'Account unavailable'],
    [new InvalidGoogleIdentityException(), 'Invalid Google identity'],
  ])(
    'maps application error %s to the existing HTTP response',
    async (error, message) => {
      vi.spyOn(app.get(AuthenticateUseCase), 'handle').mockRejectedValueOnce(
        error,
      );
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .auth('test-token', { type: 'bearer' })
        .expect(401);
      expect(response.body).toEqual({
        statusCode: 401,
        message,
        error: 'Unauthorized',
      });
    },
  );

  it('does not turn unexpected failures into authentication errors or expose their details', async () => {
    app.useLogger(false);
    vi.spyOn(app.get(AuthenticateUseCase), 'handle').mockRejectedValueOnce(
      new Error('Internal repository failure'),
    );
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .auth('test-token', { type: 'bearer' })
      .expect(500);
    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
  it('bootstraps a hashed EMAIL identity from the User event and authenticates the super admin', async () => {
    const users = app.get<UserRepository>(USER_REPOSITORY);
    const admin = (await users.findByEmail('admin@example.com'))!;
    const identity = (await app
      .get<AuthIdentityRepository>(AUTH_IDENTITY_REPOSITORY)
      .findByProvider(AuthProvider.EMAIL, 'admin@example.com'))!;
    expect(identity.subjectId).toBe(admin.id);
    const hash = identity.toPrimitives().passwordHash!;
    expect(hash).not.toBe('Test-admin-password-2026!');
    expect(
      await app
        .get<PasswordEncryptionGateway>(PASSWORD_ENCRYPTION)
        .compare('Test-admin-password-2026!', hash),
    ).toBe(true);
    const loggedIn = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: ' ADMIN@EXAMPLE.COM ',
        password: 'Test-admin-password-2026!',
      })
      .expect(200);
    expect(loggedIn.headers['cache-control']).toBe('no-store');
    expect(Object.keys(loggedIn.body).sort()).toEqual([
      'accessToken',
      'expiresIn',
      'refreshToken',
      'tokenType',
    ]);
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .auth(loggedIn.body.accessToken, { type: 'bearer' })
      .expect(200);
    expect(me.body.subjectId).toBe(admin.id);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loggedIn.body.refreshToken })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(loggedIn.body.accessToken, { type: 'bearer' })
      .expect(204);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loggedIn.body.refreshToken })
      .expect(401);
  });

  it('rejects wrong credentials, malformed requests and suspended email accounts', async () => {
    for (const email of ['admin@example.com', 'unknown@example.com']) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
      expect(response.body.message).toBe('Invalid email or password');
    }
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 123 })
      .expect(400);
    const users = app.get<UserRepository>(USER_REPOSITORY);
    const admin = (await users.findByEmail('admin@example.com'))!;
    admin.block();
    await users.save(admin);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Test-admin-password-2026!',
      })
      .expect(401);
  });

  it('refuses Google for the super admin even if an old Google identity and session exist', async () => {
    const admin = (await app
      .get<UserRepository>(USER_REPOSITORY)
      .findByEmail('admin@example.com'))!;
    const identity = await app
      .get<AuthIdentityRepository>(AUTH_IDENTITY_REPOSITORY)
      .create(
        AuthIdentity.prepareCreation({
          subjectId: admin.id!,
          provider: AuthProvider.GOOGLE,
          providerSubject: 'google-sub',
        }),
      );
    const browser = request.agent(app.getHttpServer());
    const start = await browser.get('/auth/google').expect(302);
    await browser
      .get('/auth/google/callback')
      .query({
        code: 'x',
        state: new URL(start.headers.location).searchParams.get('state'),
      })
      .expect(401);
    const session = await app.get<SessionRepository>(SESSION_REPOSITORY).create(
      Session.prepareCreation({
        subjectId: admin.id!,
        identityId: identity.id,
        ttlSeconds: 3600,
      }),
    );
    const claims = {
      sub: admin.id,
      sid: session.id,
      jti: 'old-session-token',
      iss: 'about-us',
      exp: Math.floor(Date.now() / 1000) + 60,
    };
    const jwt = app.get(JwtService);
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(jwt.sign({ ...claims, tokenUse: 'access' }), { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: jwt.sign({ ...claims, tokenUse: 'refresh' }) })
      .expect(401);
  });
});
