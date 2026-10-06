import type { AccessTokenGateway } from '../gateways/i-access-token.gateway.js';
import { AccessToken } from '../../domain/entities/access-token.js';
import type { Session } from '../../domain/entities/session.js';

export class AccessTokenIssuer {
  constructor(
    private readonly access: AccessTokenGateway,
    private readonly options: { issuer: string; accessTtlSeconds: number },
  ) {}
  async issue(session: Session) {
    const token = AccessToken.create(session, {
      issuer: this.options.issuer,
      ttlSeconds: this.options.accessTtlSeconds,
    });
    return {
      accessToken: await this.access.sign(token),
      tokenType: 'Bearer',
      expiresIn: token.toClaims().exp - Math.floor(Date.now() / 1000),
    };
  }
}
