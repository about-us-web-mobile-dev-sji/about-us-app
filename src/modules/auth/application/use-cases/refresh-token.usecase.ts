import { InvalidSessionException } from '../../domain/exceptions/invalid-session.exception.js';
import type { RefreshTokenGateway } from '../gateways/i-refresh-token.gateway.js';
import type { SessionRepository } from '../../domain/repositories/session.repositories.js';
import type { SessionValidator } from '../services/session-validator.service.js';
import type { AccessTokenIssuer } from '../services/access-token-issuer.service.js';

export class RefreshTokenUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenGateway,
    private readonly sessionValidator: SessionValidator,
    private readonly sessions: SessionRepository,
    private readonly accessTokens: AccessTokenIssuer,
  ) {}
  async handle(raw: string) {
    let session = await this.sessionValidator.validate(
      await this.refreshTokens.verify(raw),
    );
    session.touch();
    session = await this.sessions.save(session);
    if (!session.isActive()) throw new InvalidSessionException();
    return this.accessTokens.issue(session);
  }
}
