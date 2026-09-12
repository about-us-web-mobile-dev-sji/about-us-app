import { randomUUID } from 'node:crypto';
import type { Session } from './session.js';

export interface AccessTokenProps {
  id: string;
  subjectId: string;
  sessionId: string;
  issuedAt: Date;
  expiresAt: Date;
  issuer: string;
}

export class AccessToken {
  static readonly ENTITY_TYPE = 'access_token';


  private constructor(private readonly props: AccessTokenProps) {}

  static create(
    session: Session,
    input: Pick<AccessTokenProps, 'issuer'> & {
      /** Durée demandée en secondes, comprise entre 1 et 900 et limitée par la fin de session. */
      ttlSeconds: number;
    },
    now = new Date(),
  ): AccessToken {
    if (!session.isActive()) throw new Error('Session is not active');
    if (
      !Number.isInteger(input.ttlSeconds) ||
      input.ttlSeconds <= 0 ||
      input.ttlSeconds > 900
    ) {
      throw new Error('Access token TTL must be between 1 and 900 seconds');
    }
    if (!input.issuer.trim()) {
      throw new Error('Issuer is required');
    }
    const expiresAt = new Date(
      Math.min(
        now.getTime() + input.ttlSeconds * 1000,
        session.toPrimitives().expiresAt.getTime(),
      ),
    );
    return new AccessToken(
      structuredClone({
        id: randomUUID(),
        subjectId: session.subjectId,
        sessionId: session.id,
        issuedAt: now,
        expiresAt,
        issuer: input.issuer,
      }),
    );
  }
  toClaims() {
    return {
      tokenUse: 'access' as const,
      jti: this.props.id,
      sub: this.props.subjectId,
      sid: this.props.sessionId,
      iss: this.props.issuer,
      iat: Math.floor(this.props.issuedAt.getTime() / 1000),
      exp: Math.floor(this.props.expiresAt.getTime() / 1000),
    };
  }
}
