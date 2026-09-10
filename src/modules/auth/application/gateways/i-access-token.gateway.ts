import type { AccessToken } from '../../domain/entities/access-token.js';


export interface AccessTokenGateway {
  sign(token: AccessToken): Promise<string>;
  /** Vérifier signature, algorithme autorisé, issuer, expiration et tokenUse=access. */
  verify(rawToken: string): Promise<ReturnType<AccessToken['toClaims']>>;
}


export const ACCESS_TOKEN_SERVICE = Symbol('ACCESS_TOKEN_SERVICE');
