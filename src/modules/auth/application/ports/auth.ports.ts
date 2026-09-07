import type { RefreshToken } from '../../domain/entities/refresh-token.js';
import type { AccessToken } from '../../domain/entities/access-token.js';

export const AUTH_SUBJECT = Symbol('AUTH_SUBJECT');
export interface AuthSubjectPort {
  exists(subjectId: string): Promise<boolean>;
  canAuthenticate(subjectId: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export interface PasswordHasherPort {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export const ACCESS_TOKEN_SERVICE = Symbol('ACCESS_TOKEN_SERVICE');
export interface AccessTokenPort {
  sign(token: AccessToken): Promise<string>;
  /** Vérifier signature, algorithme autorisé, issuer, expiration et tokenUse=access. */
  verify(rawToken: string): Promise<ReturnType<AccessToken['toClaims']>>;
}

export const REFRESH_TOKEN_SERVICE = Symbol('REFRESH_TOKEN_SERVICE');
export interface RefreshTokenPort {
  sign(token: RefreshToken): Promise<string>;
  /** Vérifier signature, algorithme autorisé, issuer, expiration et tokenUse=refresh.
   * L'appelant doit ensuite contrôler la session et le sujet ; aucune rotation à usage unique.
   */
  verify(rawToken: string): Promise<ReturnType<RefreshToken['toClaims']>>;
}

export const GOOGLE_IDENTITY_VERIFIER = Symbol('GOOGLE_IDENTITY_VERIFIER');
export interface GoogleIdentityVerifierPort {
  /** Validate signature, issuer, audience, expiry and the expected nonce. */
  verifyIdToken(
    token: string,
    expectedNonce: string,
  ): Promise<{
    sub: string;
    email: string | null;
    emailVerified: boolean;
  }>;
}
