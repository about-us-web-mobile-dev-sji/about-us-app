import type { AuthenticateInput } from './AuthenticateInput.js';
import type { AuthenticateOutput } from './AuthenticateOutput.js';
import type { AccessTokenGateway } from '../../../gateways/i-access-token.gateway.js';
import type { SessionValidator } from '../../../services/session-validator.service.js';

export class AuthenticateUseCase {
  constructor(
    private readonly access: AccessTokenGateway,
    private readonly sessionValidator: SessionValidator,
  ) {}
  async handle(input: AuthenticateInput): Promise<AuthenticateOutput> {
    const session = await this.sessionValidator.validate(
      await this.access.verify(input.accessToken),
    );
    return { subjectId: session.subjectId, sessionId: session.id };
  }
}
