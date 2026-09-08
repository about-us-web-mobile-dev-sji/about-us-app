import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { User } from '../../../domain/entities/user.enity.js';
import UserStatus from '../../../domain/enum/user-status.enum.js';
import { GlobalRole } from '../../../domain/enum/global-role.enum.js';
import { PUserRepository } from './p-user.repository.js';
import { SqliteDatabase } from '../../../../../shared/infrastructure/database/sqlite.database.js';
import { SuperAdminEmailConflictException } from '../../../domain/exceptions/super-admin-email-conflict.exception.js';

describe('PUserRepository (SQLite)', () => {
  let database: SqliteDatabase;
  let repository: PUserRepository;
  beforeEach(() => {
    database = new SqliteDatabase(':memory:');
    repository = new PUserRepository(database);
  });
  afterEach(() => database.close());

  it('persists the role, status and identifier without confusing an email with a role', async () => {
    const ordinary = await repository.save(
      User.create({ email: 'admin@example.com' }),
    );
    expect(ordinary.globalRole).toBe(GlobalRole.USER);
    expect(await repository.superAdminExists()).toBe(false);
    const admin = User.createSuperAdmin({
      email: 'other@example.com',
      firstName: 'Admin',
    });
    admin.block();
    const saved = await repository.save(admin);
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.status).toBe(UserStatus.SUSPENDED);
    expect(saved.globalRole).toBe(GlobalRole.SUPER_ADMIN);
    expect(admin.id).toBeUndefined();
    expect((await repository.findSuperAdmin())?.id).toBe(saved.id);
  });

  it('returns the existing super admin despite different bootstrap parameters', async () => {
    const first = await repository.createInitialSuperAdmin({
      email: 'first@example.com',
    });
    const second = await repository.createInitialSuperAdmin({
      email: 'second@example.com',
    });
    expect(second.id).toBe(first.id);
    expect(second.globalRole).toBe(GlobalRole.SUPER_ADMIN);
    expect(second.status).toBe(UserStatus.ACTIVE);
    expect(await repository.findByEmail('second@example.com')).toBeNull();
  });

  it('rejects an occupied email without promoting the ordinary user', async () => {
    const user = await repository.save(
      User.create({ email: 'admin@example.com' }),
    );
    await expect(
      repository.createInitialSuperAdmin({ email: ' ADMIN@EXAMPLE.COM ' }),
    ).rejects.toBeInstanceOf(SuperAdminEmailConflictException);
    expect((await repository.findById(user.id!))?.globalRole).toBe(
      GlobalRole.USER,
    );
    expect(await repository.superAdminExists()).toBe(false);
  });

  it('enforces email uniqueness and updates the existing row by identifier', async () => {
    const saved = await repository.save(
      User.createSuperAdmin({ email: 'admin@example.com' }),
    );
    await expect(
      repository.save(User.create({ email: 'ADMIN@EXAMPLE.COM' })),
    ).rejects.toThrow();
    saved.block();
    await repository.save(saved);
    expect((await repository.findSuperAdmin())?.status).toBe(
      UserStatus.SUSPENDED,
    );
    expect(
      database.connection.prepare('SELECT count(*) AS count FROM users').get()
        ?.count,
    ).toBe(1);
  });
});
