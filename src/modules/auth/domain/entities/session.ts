import { SessionStatus } from '../enums/session-status.enums.js';

export interface SessionProps {
  id: string;
  subjectId: string;
  identityId: string;
  clientType?: 'WEB' | 'MOBILE';
  status: SessionStatus;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revocationReason: string | null;
  /** Description du navigateur ou du client, facultative et fournie par le client. */
  userAgent?: string | null;
}

export type CreateSessionInput = Pick<
  SessionProps,
  'subjectId' | 'identityId' | 'userAgent' | 'clientType'
> & {
  ttlSeconds: number;
};

export type NewSession = Omit<SessionProps, 'id'>;

export class Session {
  static readonly ENTITY_TYPE = 'session';

  /** État métier ; les changements doivent être explicitement sauvegardés. */
  private constructor(private readonly props: SessionProps) {}

  static prepareCreation(input: CreateSessionInput): NewSession {
    const now = new Date();
    if (!input.subjectId.trim() || !input.identityId.trim()) {
      throw new Error('Subject and identity are required');
    }
    if (!Number.isSafeInteger(input.ttlSeconds) || input.ttlSeconds <= 0) {
      throw new Error('Session TTL must be a positive integer');
    }
    const expiresAt = new Date(now.getTime() + input.ttlSeconds * 1000);
    if (
      !Number.isFinite(now.getTime()) ||
      !Number.isFinite(expiresAt.getTime())
    ) {
      throw new Error('Invalid session dates');
    }
    return {
      subjectId: input.subjectId,
      identityId: input.identityId,
      clientType: input.clientType ?? 'WEB',
      ...(input.userAgent !== undefined ? { userAgent: input.userAgent } : {}),
      status: SessionStatus.ACTIVE,
      createdAt: new Date(now),
      lastActivityAt: new Date(now),
      expiresAt,
      revokedAt: null,
      revocationReason: null,
    };
  }
  static reconstitute(props: SessionProps): Session {
    return new Session(structuredClone(props));
  }
  get id(): string {
    return this.props.id;
  }
  get subjectId(): string {
    return this.props.subjectId;
  }

  isActive(): boolean {
    const now = new Date();
    return (
      this.props.status === SessionStatus.ACTIVE && this.props.expiresAt > now
    );
  }

  touch(): void {
    const now = new Date();
    if (!this.isActive() || now < this.props.lastActivityAt) {
      throw new Error('Session is inactive or activity date is invalid');
    }
    this.props.lastActivityAt = new Date(now);
  }

  revoke(reason?: string): void {
    const now = new Date();
    if (this.props.status === SessionStatus.REVOKED) return;
    if (!Number.isFinite(now.getTime()) || now < this.props.lastActivityAt) {
      throw new Error('Revocation date cannot precede the last activity');
    }
    this.props.status = SessionStatus.REVOKED;
    this.props.revokedAt = new Date(now);
    this.props.revocationReason = reason?.trim() || 'No reason provided';
  }

  toPrimitives(): SessionProps {
    return structuredClone(this.props);
  }
}
