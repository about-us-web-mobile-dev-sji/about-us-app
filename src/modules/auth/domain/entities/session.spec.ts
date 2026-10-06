import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Session', () => {
  it('prepares domain dates while leaving the identifier to the database', () => {
    const input = {
      subjectId: 'subject',
      identityId: 'identity',
      ttlSeconds: 3600,
    };
    const prepared = Session.prepareCreation(input);
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
    vi.setSystemTime(activity);
    value.touch();
    expect(value.toPrimitives().lastActivityAt).toEqual(activity);
    expect(value.toPrimitives().expiresAt).toEqual(later);
    value.revoke('logout');
    vi.setSystemTime(later);
    value.revoke('second call');
    expect(value.toPrimitives().revokedAt).toEqual(activity);
    expect(value.toPrimitives().revocationReason).toBe('logout');
    expect(() => value.touch()).toThrow();
  });

  it('rejects expired and revoked sessions and isolates snapshots', () => {
    const value = session();
    value.toPrimitives().expiresAt.setTime(0);
    expect(value.isActive()).toBe(true);
    vi.setSystemTime(later);
    expect(value.isActive()).toBe(false);
    vi.setSystemTime(now);
    expect(session(SessionStatus.REVOKED).isActive()).toBe(false);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid TTL %s',
    (ttlSeconds) => {
      expect(() =>
        Session.prepareCreation({
          subjectId: 'subject',
          identityId: 'identity',
          ttlSeconds,
        }),
      ).toThrow('Session TTL');
    },
  );

  it('rejects activity and revocation before the last activity', () => {
    const value = session();
    vi.setSystemTime(new Date(now.getTime() - 1));
    expect(() => value.touch()).toThrow(
      'Session is inactive or activity date is invalid',
    );
    expect(() => value.revoke()).toThrow('Revocation date cannot precede');
  });

  it('uses a default reason when revoking without a reason', () => {
    const value = session();
    value.revoke();
    expect(value.isActive()).toBe(false);
    expect(value.toPrimitives()).toMatchObject({
      status: SessionStatus.REVOKED,
      revokedAt: now,
      revocationReason: 'No reason provided',
    });
  });
});
