import type { RefreshToken } from '../../domain/entities/refresh-token.js';

export interface RefreshTokenGateway {
  sign(token: RefreshToken): Promise<string>;
  rotate(rawToken: string): Promise<string>;
  /** Look up the opaque token hash and validate the session expiration. */
  verify(rawToken: string): Promise<ReturnType<RefreshToken['toClaims']>>;
}

export const REFRESH_TOKEN_SERVICE = Symbol('REFRESH_TOKEN_SERVICE');
