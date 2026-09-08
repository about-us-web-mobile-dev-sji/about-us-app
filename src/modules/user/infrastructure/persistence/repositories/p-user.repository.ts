import { randomUUID, type UUID } from 'node:crypto';
import { User } from '../../../domain/entities/user.enity.js';
import type { UserRepository } from '../../../domain/repositories/i-user.repository.js';
import type { PUser } from '../entity/p-user.entity.js';
import UserStatus from '../../../domain/enum/user-status.enum.js';
import { SuperAdminEmailConflictException } from '../../../domain/exceptions/super-admin-email-conflict.exception.js';
import { SqliteDatabase } from '../../../../../shared/infrastructure/database/sqlite.database.js';

export class PUserRepository implements UserRepository {
  constructor(private readonly database: SqliteDatabase) {}
  private read(row: unknown): User | null {
    if (!row) return null;
    const value = row as PUser;
    return User.reconstitute({
      ...value,
      id: value.id as UUID,
      status: value.status as UserStatus,
    });
  }
  async findById(id: string) {
    return this.read(
      this.database.connection
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(id),
    );
  }
  async findByEmail(email: string) {
    return this.read(
      this.database.connection
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(email.trim().toLowerCase()),
    );
  }
  async findSuperAdmin() {
    return this.read(
      this.database.connection
        .prepare(
          "SELECT * FROM users WHERE globalRole = 'SUPER_ADMIN' ORDER BY rowid LIMIT 1",
        )
        .get(),
    );
  }
  async superAdminExists() {
    return (await this.findSuperAdmin()) !== null;
  }
  async createInitialSuperAdmin(input: {
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    return this.database.transaction(() => {
      const existing = this.read(
        this.database.connection
          .prepare(
            "SELECT * FROM users WHERE globalRole = 'SUPER_ADMIN' ORDER BY rowid LIMIT 1",
          )
          .get(),
      );
      if (existing) return existing;
      const email = input.email.trim().toLowerCase();
      if (
        this.database.connection
          .prepare('SELECT id FROM users WHERE email = ?')
          .get(email)
      )
        throw new SuperAdminEmailConflictException();
      return this.write(User.createSuperAdmin({ ...input, email }));
    });
  }
  async save(user: User) {
    return this.write(user);
  }
  private write(user: User): User {
    const id = user.id ?? randomUUID();
    this.database.connection
      .prepare(
        `INSERT INTO users (id, firstName, lastName, email, status, globalRole) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET firstName=excluded.firstName, lastName=excluded.lastName, email=excluded.email, status=excluded.status, globalRole=excluded.globalRole`,
      )
      .run(
        id,
        user.firstName,
        user.lastName,
        user.email.trim().toLowerCase(),
        user.status,
        user.globalRole,
      );
    return this.read(
      this.database.connection
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(id),
    )!;
  }
}
