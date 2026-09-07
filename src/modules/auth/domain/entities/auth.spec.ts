import { describe, expect, it } from 'vitest';
import { AuthIdentity } from './auth-identity.js';
import { Session } from './session.js';
import { RefreshToken } from './refresh-token.js';
import { AccessToken } from './access-token.js';
import { SessionStatus } from '../enums/session-status.enums.js';
import { AuthProvider } from '../enums/auth-provider.enums.js';
const now = new Date('2026-09-07T12:00:00Z');
const later = new Date(now.getTime() + 600_000);
// Ligne simulant les valeurs retournées par la base, sans génération dans le domaine.
const session = (status = SessionStatus.ACTIVE) =>
  Session.reconstitute({
    id: 'db-session-id',
    subjectId: 'subject',
    identityId: 'db-identity-id',
    status,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: later,
    revokedAt: status === SessionStatus.REVOKED ? now : null,
    revocationReason: status === SessionStatus.REVOKED ? 'logout' : null,
  });

describe('Auth domain', () => {
  it('preserves database identity values without generating technical fields', () => {
    const row = {
      id: 'db-identity',
      subjectId: 'subject',
      provider: AuthProvider.EMAIL,
      providerSubject: 'alice@example.com',
      passwordHash: 'hash',
      createdAt: now,
      updatedAt: later,
      lastAuthenticatedAt: null,
    };
    const identity = AuthIdentity.reconstitute(row);
    expect(identity.toPrimitives()).toEqual(row);
    row.createdAt = later;
    expect(identity.toPrimitives().createdAt).toEqual(now);
  });

  it('prepares domain dates while leaving the identifier to the database', () => {
    const input = {
      subjectId: 'subject',
      identityId: 'identity',
      ttlSeconds: 3600,
    };
    const prepared = Session.prepareCreation(input, now);
    expect(prepared).toMatchObject({
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + 3600_000),
      status: SessionStatus.ACTIVE,
    });
    expect(prepared).not.toHaveProperty('id');
    expect(prepared).not.toHaveProperty('ttlSeconds');
    expect(() =>
      Session.prepareCreation({ ...input, ttlSeconds: 0 }),
    ).toThrow();
    expect(session().id).toBe('db-session-id');
  });

  it('dates activity and revocation in the domain without extending the session', () => {
    const value = session();
    const activity = new Date(now.getTime() + 1000);
    value.touch(activity);
    expect(value.toPrimitives().lastActivityAt).toEqual(activity);
    expect(value.toPrimitives().expiresAt).toEqual(later);
    value.revoke('logout', activity);
    value.revoke('second call', later);
    expect(value.toPrimitives().revokedAt).toEqual(activity);
    expect(value.toPrimitives().revocationReason).toBe('logout');
    expect(() => value.touch(later)).toThrow();
  });

  it('dates identity creation and successful authentication in the domain', () => {
    const input = AuthIdentity.prepareCreation(
      {
        subjectId: 'subject',
        provider: AuthProvider.EMAIL,
        providerSubject: 'a@example.com',
        passwordHash: 'hash',
      },
      now,
    );
    expect(input.createdAt).toEqual(now);
    const identity = AuthIdentity.reconstitute({ ...input, id: 'database-id' });
    identity.markAuthenticated(later);
    expect(identity.toPrimitives().updatedAt).toEqual(later);
    expect(identity.toPrimitives().lastAuthenticatedAt).toEqual(later);
    expect(identity.toPrimitives().createdAt).toEqual(now);
    expect(() => identity.markAuthenticated(now)).toThrow();
  });

  it('normalizes email identities and requires a hash', () => {
    const input = {
      subjectId: 'subject',
      provider: AuthProvider.EMAIL,
      providerSubject: ' Alice@Example.com ',
    };
    expect(() => AuthIdentity.prepareCreation(input)).toThrow();
    const identity = AuthIdentity.prepareCreation({
      ...input,
      passwordHash: 'adapter-produced-hash',
    });
    expect(identity.providerSubject).toBe('alice@example.com');
    expect(identity).not.toHaveProperty('id');
    expect(identity.createdAt).toBeInstanceOf(Date);
    expect(identity.updatedAt).toEqual(identity.createdAt);
  });

  it('uses Google sub independently from email and rejects passwords', () => {
    const input = {
      subjectId: 'subject',
      provider: AuthProvider.GOOGLE,
      providerSubject: 'Google-Sub',
    };
    expect(AuthIdentity.prepareCreation(input).providerSubject).toBe(
      'Google-Sub',
    );
    expect(() =>
      AuthIdentity.prepareCreation({ ...input, passwordHash: 'hash' }),
    ).toThrow();
  });

  it('rejects expired and revoked sessions and isolates snapshots', () => {
    const value = session();
    value.toPrimitives().expiresAt.setTime(0);
    expect(value.isActive(now)).toBe(true);
    expect(value.isActive(later)).toBe(false);
    expect(session(SessionStatus.REVOKED).isActive(now)).toBe(false);
  });

  it('creates non-persisted refresh claims limited to the session', () => {
    const value = session();
    const options = { issuer: 'api' };
    const token = RefreshToken.create(value, options, now);
    expect(token.toClaims()).toMatchObject({
      tokenUse: 'refresh',
      sub: 'subject',
      sid: value.id,
      exp: later.getTime() / 1000,
    });
    expect(token).not.toHaveProperty('toPrimitives');
    expect(token.toClaims()).not.toHaveProperty('tokenHash');
    expect(token.toClaims()).not.toHaveProperty('aud');
    expect(() => RefreshToken.create(value, options, later)).toThrow();
    expect(() =>
      RefreshToken.create(session(SessionStatus.REVOKED), options, now),
    ).toThrow();
  });

  it('limits JWT expiry to session expiry and includes only selected claims', () => {
    const value = session();
    const options = { issuer: 'api', ttlSeconds: 900 };
    const claims = AccessToken.create(value, options, now).toClaims();
    expect(claims.sub).toBe('subject');
    expect(claims.sid).toBe(value.id);
    expect(claims.exp).toBe(later.getTime() / 1000);
    expect(Object.keys(claims).sort()).toEqual([
      'exp',
      'iat',
      'iss',
      'jti',
      'sid',
      'sub',
      'tokenUse',
    ]);
    expect(() =>
      AccessToken.create(session(SessionStatus.REVOKED), options, now),
    ).toThrow();
  });
});
