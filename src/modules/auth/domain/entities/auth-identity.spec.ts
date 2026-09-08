import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthIdentity } from './auth-identity.js';
import { AuthProvider } from '../enums/auth-provider.enums.js';

const now = new Date('2026-09-07T12:00:00.500Z');
const later = new Date(now.getTime() + 600_000);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => vi.useRealTimers());

describe('AuthIdentity', () => {
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

  it('dates identity creation and successful authentication in the domain', () => {
    const input = AuthIdentity.prepareCreation({
      subjectId: 'subject',
      provider: AuthProvider.EMAIL,
      providerSubject: 'a@example.com',
      passwordHash: 'hash',
    });
    expect(input.createdAt).toEqual(now);
    const identity = AuthIdentity.reconstitute({ ...input, id: 'database-id' });
    vi.setSystemTime(later);
    identity.markAuthenticated();
    expect(identity.toPrimitives().updatedAt).toEqual(later);
    expect(identity.toPrimitives().lastAuthenticatedAt).toEqual(later);
    expect(identity.toPrimitives().createdAt).toEqual(now);
    vi.setSystemTime(now);
    expect(() => identity.markAuthenticated()).toThrow();
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

  it.each(['', ' '])(
    'rejects an empty subject or provider subject (%j)',
    (empty) => {
      const input = {
        subjectId: 'subject',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-sub',
      };
      expect(() =>
        AuthIdentity.prepareCreation({ ...input, subjectId: empty }),
      ).toThrow('Subject and provider subject are required');
      expect(() =>
        AuthIdentity.prepareCreation({ ...input, providerSubject: empty }),
      ).toThrow('Subject and provider subject are required');
    },
  );
});
