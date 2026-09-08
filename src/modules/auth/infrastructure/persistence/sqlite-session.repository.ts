import { randomUUID } from 'node:crypto';
import {
  Session,
  type SessionProps,
  type NewSession,
} from '../../domain/entities/session.js';
import type { SessionRepository } from '../../domain/repositories/session.repositories.js';
import { SqliteDatabase } from '../../../../shared/infrastructure/database/sqlite.database.js';

type SessionRow = Omit<
  SessionProps,
  'createdAt' | 'lastActivityAt' | 'expiresAt' | 'revokedAt'
> & {
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  revokedAt: number | null;
};
export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly database: SqliteDatabase) {}
  private read(row: unknown): Session | null {
    if (!row) return null;
    const value = row as SessionRow;
    return Session.reconstitute({
      ...value,
      createdAt: new Date(value.createdAt),
      lastActivityAt: new Date(value.lastActivityAt),
      expiresAt: new Date(value.expiresAt),
      revokedAt: value.revokedAt === null ? null : new Date(value.revokedAt),
    });
  }
  async findById(id: string) {
    return this.read(
      this.database.connection
        .prepare('SELECT * FROM auth_sessions WHERE id = ?')
        .get(id),
    );
  }
  async findBySubjectId(id: string) {
    return this.database.connection
      .prepare('SELECT * FROM auth_sessions WHERE subjectId = ?')
      .all(id)
      .map((row) => this.read(row)!);
  }
  async create(input: NewSession) {
    const id = randomUUID();
    this.database.connection
      .prepare(
        'INSERT INTO auth_sessions (id, subjectId, identityId, status, createdAt, lastActivityAt, expiresAt, revokedAt, revocationReason, userAgent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        id,
        input.subjectId,
        input.identityId,
        input.status,
        input.createdAt.getTime(),
        input.lastActivityAt.getTime(),
        input.expiresAt.getTime(),
        input.revokedAt?.getTime() ?? null,
        input.revocationReason,
        input.userAgent ?? null,
      );
    return (await this.findById(id))!;
  }
  async save(session: Session) {
    const value = session.toPrimitives();
    this.database.connection
      .prepare(
        "UPDATE auth_sessions SET status = ?, lastActivityAt = MAX(lastActivityAt, ?), revokedAt = ?, revocationReason = ? WHERE id = ? AND status <> 'REVOKED'",
      )
      .run(
        value.status,
        value.lastActivityAt.getTime(),
        value.revokedAt?.getTime() ?? null,
        value.revocationReason,
        session.id,
      );
    const saved = await this.findById(session.id);
    if (!saved) throw new Error('Session does not exist');
    return saved;
  }
}
