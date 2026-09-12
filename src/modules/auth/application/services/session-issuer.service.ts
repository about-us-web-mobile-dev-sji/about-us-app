import type { AuthSubjectGateway } from '../gateways/i-auth-subject.gateway.js';
import type { RefreshTokenGateway } from '../gateways/i-refresh-token.gateway.js';
import type { SessionRepository } from '../../domain/repositories/session.repositories.js';
import type { AccessTokenIssuer } from './access-token-issuer.service.js';
import { Session } from '../../domain/entities/session.js';
import { RefreshToken } from '../../domain/entities/refresh-token.js';
import { AccountUnavailableException } from '../../domain/exceptions/account-unavailable.exception.js';
import type { AuthenticationResult } from '../models/authentication-result.js';

export class SessionIssuer {
  constructor(
    private readonly subjects: AuthSubjectGateway,
    private readonly sessions: SessionRepository,
    private readonly access: AccessTokenIssuer,
    private readonly refresh: RefreshTokenGateway,
    private readonly options: { issuer: string; sessionTtlSeconds: number },
  ) {}
  async issue(input: {
    subjectId: string;
    identityId: string;
    userAgent?: string;
    clientType?: 'WEB' | 'MOBILE';
  }): Promise<AuthenticationResult> {
    const user = await this.subjects.authenticationProfile(input.subjectId);
    if (!user) throw new AccountUnavailableException();
    const session = await this.sessions.create(
      Session.prepareCreation({
        ...input,
        ttlSeconds: this.options.sessionTtlSeconds,
      }),
    );
    const tokens = await this.access.issue(session);
    const refreshToken = await this.refresh.sign(
      RefreshToken.create(session, { issuer: this.options.issuer }),
    );
    return { user, sessionId: session.id, ...tokens, refreshToken };
  }
}
