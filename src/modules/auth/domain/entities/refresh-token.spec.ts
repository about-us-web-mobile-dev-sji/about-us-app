import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshToken } from './refresh-token.js';
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

describe('RefreshToken', () => {
  it('creates non-persisted refresh claims limited to the session', () => {
    const value = session();
    const options = { issuer: 'api' };
    const token = RefreshToken.create(value, options);
    expect(token.toClaims()).toMatchObject({
      tokenUse: 'refresh',
      sub: 'subject',
      sid: value.id,
      exp: Math.floor(later.getTime() / 1000),
    });
    expect(token).not.toHaveProperty('toPrimitives');
    expect(token.toClaims()).not.toHaveProperty('tokenHash');
    expect(token.toClaims()).not.toHaveProperty('aud');
    vi.setSystemTime(later);
    expect(() => RefreshToken.create(value, options)).toThrow();
    vi.setSystemTime(now);
    expect(() =>
      RefreshToken.create(session(SessionStatus.REVOKED), options),
    ).toThrow();
  });

  it('generates distinct identifiers and exposes the expected JWT claims', () => {
    const first = RefreshToken.create(session(), { issuer: 'api' }).toClaims();
    const second = RefreshToken.create(session(), { issuer: 'api' }).toClaims();
    expect(first).toEqual({
      tokenUse: 'refresh',
      jti: expect.any(String),
      sub: 'subject',
      sid: 'db-session-id',
      iss: 'api',
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(later.getTime() / 1000),
    });
    expect(first.jti).not.toBe(second.jti);
  });

  it('rejects blank issuers', () => {
    expect(() => RefreshToken.create(session(), { issuer: ' ' })).toThrow(
      'Issuer is required',
    );
  });
});
