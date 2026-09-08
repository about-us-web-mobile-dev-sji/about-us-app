import { randomUUID } from 'node:crypto';
import {
  AuthIdentity,
  type AuthIdentityProps,
  type NewAuthIdentity,
} from '../../domain/entities/auth-identity.js';
import type { AuthIdentityRepository } from '../../domain/repositories/auth-identity.repositories.js';
import type { AuthProvider } from '../../domain/enums/auth-provider.enums.js';
import { SqliteDatabase } from '../../../../shared/infrastructure/database/sqlite.database.js';

type IdentityRow = Omit<
  AuthIdentityProps,
  'createdAt' | 'updatedAt' | 'lastAuthenticatedAt'
> & {
  createdAt: number;
  updatedAt: number;
  lastAuthenticatedAt: number | null;
};
export class SqliteAuthIdentityRepository implements AuthIdentityRepository {
  constructor(private readonly database: SqliteDatabase) {}
  private read(row: unknown): AuthIdentity | null {
    if (!row) return null;
    const value = row as IdentityRow;
    return AuthIdentity.reconstitute({
      ...value,
      createdAt: new Date(value.createdAt),
      updatedAt: new Date(value.updatedAt),
      lastAuthenticatedAt:
        value.lastAuthenticatedAt === null
          ? null
          : new Date(value.lastAuthenticatedAt),
    });
  }
  async findById(id: string) {
    return this.read(
      this.database.connection
        .prepare('SELECT * FROM auth_identities WHERE id = ?')
        .get(id),
    );
  }
  async findByProvider(provider: AuthProvider, subject: string) {
    return this.read(
      this.database.connection
        .prepare(
          'SELECT * FROM auth_identities WHERE provider = ? AND providerSubject = ?',
        )
        .get(provider, subject),
    );
  }
  async findBySubjectAndProvider(subjectId: string, provider: AuthProvider) {
    return this.read(
      this.database.connection
        .prepare(
          'SELECT * FROM auth_identities WHERE subjectId = ? AND provider = ?',
        )
        .get(subjectId, provider),
    );
  }
  private insert(input: NewAuthIdentity, ignoreConflict = false): string {
    const id = randomUUID();
    this.database.connection
      .prepare(
        `INSERT INTO auth_identities (id, subjectId, provider, providerSubject, passwordHash, createdAt, updatedAt, lastAuthenticatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ${ignoreConflict ? 'ON CONFLICT DO NOTHING' : ''}`,
      )
      .run(
        id,
        input.subjectId,
        input.provider,
        input.providerSubject,
        input.passwordHash,
        input.createdAt.getTime(),
        input.updatedAt.getTime(),
        input.lastAuthenticatedAt?.getTime() ?? null,
      );
    return id;
  }
  async create(input: NewAuthIdentity) {
    const id = this.insert(input);
    return (await this.findById(id))!;
  }
  async createIfAbsent(input: NewAuthIdentity) {
    return this.database.transaction(() => {
      this.insert(input, true);
      const identity = this.read(
        this.database.connection
          .prepare(
            'SELECT * FROM auth_identities WHERE provider = ? AND (subjectId = ? OR providerSubject = ?) ORDER BY subjectId = ? DESC LIMIT 1',
          )
          .get(
            input.provider,
            input.subjectId,
            input.providerSubject,
            input.subjectId,
          ),
      );
      if (!identity || identity.subjectId !== input.subjectId)
        throw new Error('Super admin email belongs to another identity');
      return identity;
    });
  }
  async save(identity: AuthIdentity) {
    const value = identity.toPrimitives();
    this.database.connection
      .prepare(
        `UPDATE auth_identities SET updatedAt = MAX(updatedAt, ?), lastAuthenticatedAt = CASE WHEN ? IS NULL THEN lastAuthenticatedAt ELSE MAX(COALESCE(lastAuthenticatedAt, 0), ?) END WHERE id = ?`,
      )
      .run(
        value.updatedAt.getTime(),
        value.lastAuthenticatedAt?.getTime() ?? null,
        value.lastAuthenticatedAt?.getTime() ?? null,
        identity.id,
      );
    const saved = await this.findById(identity.id);
    if (!saved) throw new Error('Identity does not exist');
    return saved;
  }
}
