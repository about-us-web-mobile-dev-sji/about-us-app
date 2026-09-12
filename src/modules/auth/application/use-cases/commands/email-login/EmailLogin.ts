import type { EmailLoginInput } from './EmailLoginInput.js';
import type { EmailLoginOutput } from './EmailLoginOutput.js';
import type { AuthIdentityRepository } from '../../../../domain/repositories/auth-identity.repositories.js';
import type { SessionRepository } from '../../../../domain/repositories/session.repositories.js';
import type { PasswordEncryptionGateway } from '../../../gateways/i-password-encryption.gateway.js';
import type { AuthSubjectGateway } from '../../../gateways/i-auth-subject.gateway.js';
import type { RefreshTokenGateway } from '../../../gateways/i-refresh-token.gateway.js';
import type { AccessTokenIssuer } from '../../../services/access-token-issuer.service.js';
import { AuthProvider } from '../../../../domain/enums/auth-provider.enums.js';
import { SessionIssuer } from '../../../services/session-issuer.service.js';
import { InvalidCredentialsException } from '../../../../domain/exceptions/invalid-credentials.exception.js';

export class EmailLoginUseCase {
  constructor(
    private readonly identities: AuthIdentityRepository,
    private readonly passwords: PasswordEncryptionGateway,
    private readonly subjects: AuthSubjectGateway,
    private readonly sessions: SessionRepository,
    private readonly accessTokens: AccessTokenIssuer,
    private readonly refreshTokens: RefreshTokenGateway,
    private readonly options: { issuer: string; sessionTtlSeconds: number },
  ) {}
  async handle(input: EmailLoginInput): Promise<EmailLoginOutput> {
    if (
      !input.email?.trim() ||
      !input.password ||
      new TextEncoder().encode(input.password).length > 72
    )
      throw new InvalidCredentialsException();
    const identity = await this.identities.findByProvider(
      AuthProvider.EMAIL,
      input.email.trim().toLowerCase(),
    );
    const hash = identity?.toPrimitives().passwordHash;
    if (
      !identity ||
      !hash ||
      !(await this.passwords.compare(input.password, hash)) ||
      !(await this.subjects.canAuthenticate(identity.subjectId))
    ) {
      throw new InvalidCredentialsException();
    }
    identity.markAuthenticated();
    await this.identities.save(identity);
    return new SessionIssuer(
      this.subjects,
      this.sessions,
      this.accessTokens,
      this.refreshTokens,
      this.options,
    ).issue({
      subjectId: identity.subjectId,
      identityId: identity.id,
      userAgent: input.userAgent,
      clientType: input.clientType,
    });
  }
}
