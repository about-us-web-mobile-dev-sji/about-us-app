import { AuthProvider } from '../../domain/enums/auth-provider.enums.js';
import { InvalidSessionException } from '../../domain/exceptions/invalid-session.exception.js';
import { AccountUnavailableException } from '../../domain/exceptions/account-unavailable.exception.js';
import type { AuthSubjectGateway } from '../gateways/i-auth-subject.gateway.js';
import type { AuthIdentityRepository } from '../../domain/repositories/auth-identity.repositories.js';
import type { SessionRepository } from '../../domain/repositories/session.repositories.js';

export class SessionValidator {
  constructor(
    private readonly subjects: AuthSubjectGateway,
    private readonly identities: AuthIdentityRepository,
    private readonly sessions: SessionRepository,
  ) {}
  async validate(claims: { sid: string; sub: string }) {
    const session = await this.sessions.findById(claims.sid);
    if (!session?.isActive() || session.subjectId !== claims.sub)
      throw new InvalidSessionException();
    const identity = await this.identities.findById(
      session.toPrimitives().identityId,
    );
    if (
      !identity ||
      identity.subjectId !== claims.sub ||
      !(await this.subjects.canAuthenticate(claims.sub))
    )
      throw new AccountUnavailableException();
    if (
      identity.toPrimitives().provider === AuthProvider.GOOGLE &&
      !(await this.subjects.canAuthenticateWithGoogle(claims.sub))
    ) {
      throw new AccountUnavailableException();
    }
    return session;
  }
}
