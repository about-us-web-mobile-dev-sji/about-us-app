import type { RefreshToken } from '../../domain/entities/refresh-token.js';

export interface RefreshTokenGateway {
  sign(token: RefreshToken): Promise<string>;
  /** Vérifier signature, algorithme autorisé, issuer, expiration et tokenUse=refresh.
   * L'appelant doit ensuite contrôler la session et le sujet ; aucune rotation à usage unique.
   */
  verify(rawToken: string): Promise<ReturnType<RefreshToken['toClaims']>>;
}


export const REFRESH_TOKEN_SERVICE = Symbol('REFRESH_TOKEN_SERVICE');
