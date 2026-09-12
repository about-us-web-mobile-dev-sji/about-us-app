import { generateKeyPairSync } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleTokenVerifier } from './google-token-verifier.js';

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKey = keys.privateKey
  .export({ type: 'pkcs8', format: 'pem' })
  .toString();
const publicKey = keys.publicKey
  .export({ type: 'spki', format: 'pem' })
  .toString();
const jwt = new JwtService({
  privateKey,
  signOptions: { algorithm: 'RS256', keyid: 'test-key' },
});

describe('GoogleTokenVerifier', () => {
  beforeEach(() => {
    vi.spyOn(
      OAuth2Client.prototype,
      'getFederatedSignonCertsAsync',
    ).mockResolvedValue({
      certs: { 'test-key': publicKey },
      format: 'PEM' as Awaited<
        ReturnType<OAuth2Client['getFederatedSignonCertsAsync']>
      >['format'],
    });
  });
  afterEach(() => vi.restoreAllMocks());
  function token(overrides: Record<string, unknown> = {}) {
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign({
      iss: 'https://accounts.google.com',
      aud: 'allowed-client',
      sub: 'stable-google-sub',
      email: 'Alice@example.com',
      email_verified: true,
      iat: now,
      exp: now + 3600,
      ...overrides,
    });
  }
  it('validates a signed token and keeps Google sub as the identity key', async () => {
    await expect(
      new GoogleTokenVerifier(['allowed-client']).verify(token()),
    ).resolves.toMatchObject({
      sub: 'stable-google-sub',
      email: 'alice@example.com',
      emailVerified: true,
    });
  });
  it.each([
    { aud: 'another-client' },
    { iss: 'https://attacker.example' },
    { iat: 1, exp: 2 },
    { email_verified: false },
    { sub: '' },
  ])('rejects invalid claims %j', async (claims) => {
    await expect(
      new GoogleTokenVerifier(['allowed-client']).verify(token(claims)),
    ).rejects.toThrow('Invalid Google ID token');
  });
  it('rejects a forged signature', async () => {
    const raw = token().split('.');
    raw[2] = Buffer.alloc(256).toString('base64url');
    await expect(
      new GoogleTokenVerifier(['allowed-client']).verify(raw.join('.')),
    ).rejects.toThrow('Invalid Google ID token');
  });
});
