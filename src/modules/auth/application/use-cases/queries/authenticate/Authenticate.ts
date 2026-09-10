import type { AuthenticateInput } from './AuthenticateInput.js';
import type { AuthenticateOutput } from './AuthenticateOutput.js';
import type { AccessTokenGateway } from '../../../gateways/i-access-token.gateway.js';
import type { SessionValidator } from '../../../services/session-validator.service.js';
import type { AuthSubjectGateway } from '../../../gateways/i-auth-subject.gateway.js';
import { AccountUnavailableException } from '../../../../domain/exceptions/account-unavailable.exception.js';

export class AuthenticateUseCase {
  constructor(
    private readonly access: AccessTokenGateway,
    private readonly sessionValidator: SessionValidator,
    private readonly subjects: AuthSubjectGateway,
  ) {}
  async handle(input: AuthenticateInput): Promise<AuthenticateOutput> {
    const session = await this.sessionValidator.validate(
      await this.access.verify(input.accessToken),
    );
    const user = await this.subjects.authenticationProfile(session.subjectId);
    if (!user) throw new AccountUnavailableException();
    return { subjectId: session.subjectId, sessionId: session.id, user };
  }
}
