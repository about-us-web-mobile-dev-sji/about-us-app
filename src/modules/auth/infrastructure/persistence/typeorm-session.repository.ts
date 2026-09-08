import { SessionMapper } from './mappers/session.mapper.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthSessionEntity } from './typeorm/auth-session.entity.js';
import { Session, type NewSession } from '../../domain/entities/session.js';
import { SessionRepository } from '../../domain/repositories/session.repositories.js';
import { randomUUID } from 'node:crypto';

export class TypeormSessionRepository implements SessionRepository {
  constructor(
    @InjectRepository(AuthSessionEntity)
    private readonly repo: Repository<AuthSessionEntity>,
  ) {}

  private read(e: AuthSessionEntity | null) {
    return e ? SessionMapper.toDomain(e) : null;
  }

  async findById(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    return this.read(e);
  }

  async findBySubjectId(subjectId: string) {
    const rows = await this.repo.find({ where: { subjectId } });
    return rows.map((r) => this.read(r)!).filter(Boolean);
  }

  async create(input: NewSession) {
    const id = randomUUID();
    const e = SessionMapper.toPersistence(input, id);
    await this.repo.save(e);
    return (await this.findById(id))!;
  }

  async save(session: Session) {
    const v = session.toPrimitives();
    await this.repo.update(v.id, {
      status: v.status,
      lastActivityAt: v.lastActivityAt.getTime(),
      expiresAt: v.expiresAt.getTime(),
      revokedAt: v.revokedAt?.getTime() ?? null,
      revocationReason: v.revocationReason ?? null,
    });
    const saved = await this.findById(session.id);
    if (!saved) throw new Error('Session does not exist');
    return saved;
  }
}
