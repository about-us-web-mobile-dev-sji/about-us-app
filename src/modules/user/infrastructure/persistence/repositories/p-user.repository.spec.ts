import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { beforeEach } from 'vitest';
import { User } from '../../../domain/entities/user.enity.js';
import UserStatus from '../../../domain/enum/user-status.enum.js';
import { PUserRepository } from './p-user.repository.js';
import { UserPersistenceMapper } from '../mappers/user.persistence.mapper.js';
import UserRole from '../../../domain/enum/user-role.enum.js';

describe('PUserRepository', () => {
  let configService: ConfigService;
  let userPersistenceMapper: UserPersistenceMapper;

  beforeEach(() => {
    configService = new ConfigService({
      'super-admin': { email: 'admin@example.com' },
    });
    userPersistenceMapper = new UserPersistenceMapper();
  });

  it('saves a new user with an identifier and preserves domain fields', async () => {
    const repository = new PUserRepository(configService, userPersistenceMapper);
    const user = User.create({
      email: 'admin@example.com',
      firstName: 'Admin',
      role: UserRole.ADMINISTRATOR,
    });
    user.block();

    expect(await repository.superAdminExists()).toBe(false);
    const saved = await repository.save(user);

    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.firstName).toBe('Admin');
    expect(saved.lastName).toBeNull();
    expect(saved.status).toBe(UserStatus.SUSPENDED);
    expect(user.id).toBeUndefined();
    expect(await repository.superAdminExists()).toBe(true);
  });

  it('replaces an existing record by identifier instead of appending it', async () => {
    const repository = new PUserRepository(configService, userPersistenceMapper);
    const saved = await repository.save(
      User.create({ email: 'admin@example.com', 
        role: UserRole.ADMINISTRATOR }),
    );
    const updated = User.reconstitute({
      id: saved.id!,
      firstName: null,
      lastName: 'Updated',
      email: 'user@example.com',
      status: UserStatus.ACTIVE,
      role: UserRole.SUPER_ADMIN,
    });

    expect((await repository.save(updated)).id).toBe(saved.id);
    expect(await repository.superAdminExists()).toBe(false);
  });

  it('inserts users with existing identifiers and isolates repository instances', async () => {
    const repository = new PUserRepository(configService, userPersistenceMapper);
    const user = User.reconstitute({
      id: randomUUID(),
      firstName: null,
      lastName: null,
      email: 'admin@example.com',
      status: UserStatus.ACTIVE,
      role: UserRole.SUPER_ADMIN,
    });

    expect((await repository.save(user)).id).toBe(user.id);
    expect(await repository.superAdminExists()).toBe(true);
    expect(await new PUserRepository(configService, userPersistenceMapper).superAdminExists()).toBe(
      false,
    );
  });

  it('filters users by school identifier without loading the school module', async () => {
    const repository = new PUserRepository(configService, userPersistenceMapper);

    const result = await repository.getAll(
      { schoolId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      { page: 1, limit: 10 },
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.every((user) => user.schoolId === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).toBe(true);
  });
});
