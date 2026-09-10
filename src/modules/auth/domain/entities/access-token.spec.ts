import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessToken } from './access-token.js';
import { Session } from './session.js';
import { SessionStatus } from '../enums/session-status.enums.js';

const now = new Date('2026-09-07T12:00:00.500Z');
const later = new Date(now.getTime() + 600_000);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => vi.useRealTimers());

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

describe('AccessToken', () => {
  it('limits JWT expiry to session expiry and includes only selected claims', () => {
    const value = session();
    const options = { issuer: 'api', ttlSeconds: 900 };
    const claims = AccessToken.create(value, options).toClaims();
    expect(claims.sub).toBe('subject');
    expect(claims.sid).toBe(value.id);
    expect(claims.exp).toBe(Math.floor(later.getTime() / 1000));
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
      AccessToken.create(session(SessionStatus.REVOKED), options),
    ).toThrow();
  });

  it('uses the requested lifetime when the session lasts longer', () => {
    const claims = AccessToken.create(session(), {
      issuer: 'api',
      ttlSeconds: 60,
    }).toClaims();
    expect(claims.iat).toBe(Math.floor(now.getTime() / 1000));
    expect(claims.exp).toBe(Math.floor(now.getTime() / 1000) + 60);
    expect(claims.iss).toBe('api');
    expect(claims.tokenUse).toBe('access');
  });

  it.each([0, -1, 1.5, 901, NaN, Infinity])(
    'rejects invalid TTL %s',
    (ttlSeconds) => {
      expect(() =>
        AccessToken.create(session(), { issuer: 'api', ttlSeconds }),
      ).toThrow('Access token TTL');
    },
  );

  it('rejects blank issuers and expired sessions', () => {
    expect(() =>
      AccessToken.create(session(), { issuer: ' ', ttlSeconds: 60 }),
    ).toThrow('Issuer is required');
    vi.setSystemTime(later);
    expect(() =>
      AccessToken.create(session(), { issuer: 'api', ttlSeconds: 60 }),
    ).toThrow('Session is not active');
  });
});
