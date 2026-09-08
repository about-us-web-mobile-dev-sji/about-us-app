import type { AccessTokenGateway } from '../gateways/i-access-token.gateway.js';
import type { SessionValidator } from '../services/session-validator.service.js';

export class AuthenticateUseCase {
  constructor(
    private readonly access: AccessTokenGateway,
    private readonly sessionValidator: SessionValidator,
  ) {}
  async handle(raw: string) {
    const session = await this.sessionValidator.validate(
      await this.access.verify(raw),
    );
    return { subjectId: session.subjectId, sessionId: session.id };
  }
}
