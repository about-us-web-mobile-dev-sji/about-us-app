import type { LogoutInput } from './LogoutInput.js';
import type { LogoutOutput } from './LogoutOutput.js';
import type { AccessTokenGateway } from '../../../gateways/i-access-token.gateway.js';
import type { SessionValidator } from '../../../services/session-validator.service.js';
import type { SessionRepository } from '../../../../domain/repositories/session.repositories.js';
import type { RefreshTokenGateway } from '../../../gateways/i-refresh-token.gateway.js';
import { InvalidSessionException } from '../../../../domain/exceptions/invalid-session.exception.js';

export class LogoutUseCase {
  constructor(
    private readonly access: AccessTokenGateway,
    private readonly sessionValidator: SessionValidator,
    private readonly sessions: SessionRepository,
    private readonly refresh: RefreshTokenGateway,
  ) {}
  async handle(input: LogoutInput): Promise<LogoutOutput> {
    if (!input.refreshToken && !input.accessToken)
      throw new InvalidSessionException();
    const claims = input.refreshToken
      ? await this.refresh.verify(input.refreshToken)
      : await this.access.verify(input.accessToken!);
    const session = await this.sessionValidator.validate(claims);
    if (
      input.clientType &&
      session.toPrimitives().clientType !== input.clientType
    )
      throw new InvalidSessionException();
    session.revoke('logout');
    await this.sessions.save(session);
  }
}
