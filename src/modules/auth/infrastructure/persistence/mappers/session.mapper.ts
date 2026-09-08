import { Session, type NewSession } from '../../../domain/entities/session.js';
import { AuthSessionEntity } from '../typeorm/auth-session.entity.js';
export class SessionMapper {
  static toDomain(row: AuthSessionEntity): Session {
    return Session.reconstitute({
      id: row.id,
      subjectId: row.subjectId,
      identityId: row.identityId,
      status: row.status,
      createdAt: new Date(row.createdAt),
      lastActivityAt: new Date(row.lastActivityAt),
      expiresAt: new Date(row.expiresAt),
      revokedAt: row.revokedAt === null ? null : new Date(row.revokedAt),
      revocationReason: row.revocationReason,
      userAgent: row.userAgent,
    });
  }
  static toPersistence(value: NewSession, id: string): AuthSessionEntity {
    return Object.assign(new AuthSessionEntity(), {
      id,
      subjectId: value.subjectId,
      identityId: value.identityId,
      status: value.status,
      createdAt: value.createdAt.getTime(),
      lastActivityAt: value.lastActivityAt.getTime(),
      expiresAt: value.expiresAt.getTime(),
      revokedAt: value.revokedAt?.getTime() ?? null,
      revocationReason: value.revocationReason,
      userAgent: value.userAgent ?? null,
    });
  }
}
