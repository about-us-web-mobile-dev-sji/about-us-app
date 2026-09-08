import { randomUUID } from 'node:crypto';
import {
  Session,
  type SessionProps,
  type NewSession,
} from '../../domain/entities/session.js';
import { SessionStatus } from '../../domain/enums/session-status.enums.js';
import type { SessionRepository } from '../../domain/repositories/session.repositories.js';
export class MemorySessionRepository implements SessionRepository {
  private readonly rows = new Map<string, SessionProps>();
  async findById(id: string) {
    const row = this.rows.get(id);
    return row ? Session.reconstitute(row) : null;
  }
  async findBySubjectId(id: string) {
    return [...this.rows.values()]
      .filter((v) => v.subjectId === id)
      .map((v) => Session.reconstitute(v));
  }
  async create(input: NewSession) {
    return this.save(Session.reconstitute({ ...input, id: randomUUID() }));
  }
  async save(session: Session) {
    const current = this.rows.get(session.id);
    if (current?.status === SessionStatus.REVOKED)
      return Session.reconstitute(current);
    const row = session.toPrimitives();
    if (current && current.lastActivityAt > row.lastActivityAt)
      row.lastActivityAt = current.lastActivityAt;
    this.rows.set(session.id, row);
    return Session.reconstitute(row);
  }
}
