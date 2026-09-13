import { describe, expect, it, vi } from 'vitest';
import { UserAccountService } from './user-account.service.js';
import { User } from '../domain/entities/user.entity.js';
import { GlobalRole } from '../domain/enum/global-role.enum.js';
import UserStatus from '../domain/enum/user-status.enum.js';
import type { UserRepository } from '../domain/repositories/i-user.repository.js';
import { InvalidUserException } from '../domain/exceptions/invalid-user.exception.js';
import { UserEmailAlreadyUsedException } from '../domain/exceptions/user-email-already-used.exception.js';
const id = '00000000-0000-4000-8000-000000000001';
function setup(existing: User | null = null) {
  const repository = {
    findById: vi.fn(async () => existing),
    findByEmail: vi.fn(async () => existing),
    findSuperAdmin: vi.fn(async () => null),
    superAdminExists: vi.fn(async () => false),
    getAll: vi.fn(async () => ({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    })),
    createInitialSuperAdmin: vi.fn<UserRepository['createInitialSuperAdmin']>(),
    save: vi.fn(async (user: User) =>
      User.reconstitute({
        id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        globalRole: user.globalRole,
      }),
    ),
  } satisfies UserRepository;
  return { repository, service: new UserAccountService(repository) };
}
describe('UserAccountService', () => {
  it('normalizes email before checking uniqueness and persists an ordinary active account', async () => {
    const { service, repository } = setup();
    expect(await service.create({ email: ' Alice@Example.COM ' })).toBe(id);
    expect(repository.findByEmail).toHaveBeenCalledWith('alice@example.com');
    const saved = repository.save.mock.calls[0][0];
    expect(saved.globalRole).toBe(GlobalRole.USER);
    expect(saved.status).toBe(UserStatus.ACTIVE);
  });
  it('rejects malformed email before accessing the repository', async () => {
    const { service, repository } = setup();
    await expect(service.create({ email: 'invalid' })).rejects.toBeInstanceOf(
      InvalidUserException,
    );
    expect(repository.findByEmail).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('reports duplicate email without overwriting an existing account', async () => {
    const { service, repository } = setup(
      User.create({ email: 'alice@example.com' }),
    );
    await expect(
      service.create({ email: 'ALICE@example.com' }),
    ).rejects.toBeInstanceOf(UserEmailAlreadyUsedException);
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('preserves a persistence conflict caused by concurrent creation', async () => {
    const { service, repository } = setup();
    repository.save.mockRejectedValueOnce(new UserEmailAlreadyUsedException());
    await expect(
      service.create({ email: 'alice@example.com' }),
    ).rejects.toBeInstanceOf(UserEmailAlreadyUsedException);
  });
  it('refuses authentication for missing and suspended users, including super admins', async () => {
    const missing = setup().service;
    expect(await missing.exists(id)).toBe(false);
    expect(await missing.canAuthenticate(id)).toBe(false);
    expect(await missing.requiresPasswordAuthentication(id)).toBe(false);
    const user = User.createSuperAdmin({ email: 'admin@example.com' });
    const { service } = setup(user);
    expect(await service.exists(id)).toBe(true);
    expect(await service.canAuthenticate(id)).toBe(true);
    expect(await service.requiresPasswordAuthentication(id)).toBe(true);
    user.block();
    expect(await service.canAuthenticate(id)).toBe(false);
    user.activate();
    expect(await service.canAuthenticate(id)).toBe(true);
  });
});
