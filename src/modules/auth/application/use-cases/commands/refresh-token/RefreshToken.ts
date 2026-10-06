import type { RefreshTokenInput } from './RefreshTokenInput.js';
import type { RefreshTokenOutput } from './RefreshTokenOutput.js';
import { InvalidSessionException } from '../../../../domain/exceptions/invalid-session.exception.js';
import type { RefreshTokenGateway } from '../../../gateways/i-refresh-token.gateway.js';
import type { SessionRepository } from '../../../../domain/repositories/session.repositories.js';
import type { SessionValidator } from '../../../services/session-validator.service.js';
import type { AccessTokenIssuer } from '../../../services/access-token-issuer.service.js';
import type { AuthSubjectGateway } from '../../../gateways/i-auth-subject.gateway.js';

export class RefreshTokenUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenGateway,
    private readonly sessionValidator: SessionValidator,
    private readonly sessions: SessionRepository,
    private readonly accessTokens: AccessTokenIssuer,
    private readonly subjects: AuthSubjectGateway,
  ) {}
  async handle(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    let session = await this.sessionValidator.validate(
      await this.refreshTokens.verify(input.refreshToken),
    );
    if (
      input.clientType &&
      session.toPrimitives().clientType !== input.clientType
    )
      throw new InvalidSessionException();
    session.touch();
    session = await this.sessions.save(session);
    if (!session.isActive()) throw new InvalidSessionException();
    const user = await this.subjects.authenticationProfile(session.subjectId);
    if (!user) throw new InvalidSessionException();
    const access = await this.accessTokens.issue(session);
    const refreshToken = await this.refreshTokens.rotate(input.refreshToken);
    return { ...access, refreshToken, user, sessionId: session.id };
  }
}
