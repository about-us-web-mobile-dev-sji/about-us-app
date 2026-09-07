import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { beforeEach } from 'vitest';
import { User } from '../../../domain/entities/user.enity.js';
import UserStatus from '../../../domain/enum/user-status.enum.js';
import { PUserRepository } from './p-user.repository.js';

describe('PUserRepository', () => {
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService({
      'super-admin': { email: 'admin@example.com' },
    });
  });

  it('saves a new user with an identifier and preserves domain fields', async () => {
    const repository = new PUserRepository(configService);
    const user = User.create({
      email: 'admin@example.com',
      firstName: 'Admin',
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
    const repository = new PUserRepository(configService);
    const saved = await repository.save(
      User.create({ email: 'admin@example.com' }),
    );
    const updated = User.reconstitute({
      id: saved.id!,
      firstName: null,
      lastName: 'Updated',
      email: 'user@example.com',
      status: UserStatus.ACTIVE,
    });

    expect((await repository.save(updated)).id).toBe(saved.id);
    expect(await repository.superAdminExists()).toBe(false);
  });

  it('inserts users with existing identifiers and isolates repository instances', async () => {
    const repository = new PUserRepository(configService);
    const user = User.reconstitute({
      id: randomUUID(),
      firstName: null,
      lastName: null,
      email: 'admin@example.com',
      status: UserStatus.ACTIVE,
    });

    expect((await repository.save(user)).id).toBe(user.id);
    expect(await repository.superAdminExists()).toBe(true);
    expect(await new PUserRepository(configService).superAdminExists()).toBe(
      false,
    );
  });
});
