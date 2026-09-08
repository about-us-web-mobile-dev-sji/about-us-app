import type { AccessTokenGateway } from '../gateways/i-access-token.gateway.js';
import type { SessionValidator } from '../services/session-validator.service.js';
import type { SessionRepository } from '../../domain/repositories/session.repositories.js';

export class LogoutUseCase {
  constructor(
    private readonly access: AccessTokenGateway,
    private readonly sessionValidator: SessionValidator,
    private readonly sessions: SessionRepository,
  ) {}
  async handle(raw: string) {
    const session = await this.sessionValidator.validate(
      await this.access.verify(raw),
    );
    session.revoke('logout');
    await this.sessions.save(session);
  }
}
