import { randomUUID } from 'node:crypto';
import type { Session } from './session.js';

export interface RefreshTokenProps {
  id: string;
  subjectId: string;
  sessionId: string;
  issuedAt: Date;
  expiresAt: Date;
  issuer: string;
}

export class RefreshToken {
  /** État immuable des claims à signer ; aucun secret ni hash stocké. */
  private constructor(private readonly props: RefreshTokenProps) {}

  static create(
    session: Session,
    input: Pick<RefreshTokenProps, 'issuer'>
  ): RefreshToken {
    const now = new Date();
    if (!session.isActive()) throw new Error('Session is not active');
    if (!input.issuer.trim()) {
      throw new Error('Issuer is required');
    }
    return new RefreshToken(
      structuredClone({
        id: randomUUID(),
        subjectId: session.subjectId,
        sessionId: session.id,
        issuedAt: now,
        expiresAt: session.toPrimitives().expiresAt,
        issuer: input.issuer,
      }),
    );
  }

  toClaims() {
    return {
      tokenUse: 'refresh' as const,
      jti: this.props.id,
      sub: this.props.subjectId,
      sid: this.props.sessionId,
      iss: this.props.issuer,
      iat: Math.floor(this.props.issuedAt.getTime() / 1000),
      exp: Math.floor(this.props.expiresAt.getTime() / 1000),
    };
  }
}
