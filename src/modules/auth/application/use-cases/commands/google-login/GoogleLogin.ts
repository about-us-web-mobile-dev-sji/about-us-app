import type { GoogleLoginInput } from './GoogleLoginInput.js';
import type { GoogleLoginOutput } from './GoogleLoginOutput.js';
import { AccountUnavailableException } from '../../../../domain/exceptions/account-unavailable.exception.js';
import { InvalidGoogleIdentityException } from '../../../../domain/exceptions/invalid-google-identity.exception.js';
import type { AuthSubjectGateway } from '../../../gateways/i-auth-subject.gateway.js';
import type { RefreshTokenGateway } from '../../../gateways/i-refresh-token.gateway.js';
import type { AuthIdentityRepository } from '../../../../domain/repositories/auth-identity.repositories.js';
import type { SessionRepository } from '../../../../domain/repositories/session.repositories.js';
import { AuthIdentity } from '../../../../domain/entities/auth-identity.js';
import { SessionIssuer } from '../../../services/session-issuer.service.js';
import { AuthProvider } from '../../../../domain/enums/auth-provider.enums.js';
import type { AccessTokenIssuer } from '../../../services/access-token-issuer.service.js';

export class GoogleLoginUseCase {
  // Serialize local provisioning; replace with a transaction for durable storage.
  private loginQueue: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly subjects: AuthSubjectGateway,
    private readonly identities: AuthIdentityRepository,
    private readonly sessions: SessionRepository,
    private readonly accessTokens: AccessTokenIssuer,
    private readonly refreshTokens: RefreshTokenGateway,
    private readonly options: { issuer: string; sessionTtlSeconds: number },
  ) {}
  handle(input: GoogleLoginInput): Promise<GoogleLoginOutput> {
    const result = this.loginQueue.then(() => this.completeGoogleLogin(input));
    this.loginQueue = result.catch(() => undefined);
    return result;
  }
  private async completeGoogleLogin(
    input: GoogleLoginInput,
  ): Promise<GoogleLoginOutput> {
    const { profile, userAgent } = input;
    if (
      !profile.sub?.trim() ||
      !profile.emailVerified ||
      !profile.email?.trim()
    )
      throw new InvalidGoogleIdentityException();
    let identity = await this.identities.findByProvider(
      AuthProvider.GOOGLE,
      profile.sub,
    );
    if (!identity) {
      const subjectId = await this.subjects.create({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
      identity = await this.identities.create(
        AuthIdentity.prepareCreation({
          subjectId,
          provider: AuthProvider.GOOGLE,
          providerSubject: profile.sub,
        }),
      );
    }
    if (!(await this.subjects.canAuthenticateWithGoogle(identity.subjectId)))
      throw new AccountUnavailableException();
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
      userAgent,
      clientType: input.clientType,
    });
  }
}
