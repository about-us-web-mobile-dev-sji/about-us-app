import { describe, expect, it, vi } from 'vitest';
import { CreateSuperAdminUseCase } from './CreateSuperAdmin.js';
import { User } from '../../../../domain/entities/user.entity.js';
import { GlobalRole } from '../../../../domain/enum/global-role.enum.js';
import UserStatus from '../../../../domain/enum/user-status.enum.js';
import type { UserRepository } from '../../../../domain/repositories/i-user.repository.js';
function setup() {
  let current: User | null = null;
  const repository: UserRepository = {
    findSuperAdmin: vi.fn(async () => current),
    findById: vi.fn(async () => current),
    findByEmail: vi.fn(async () => current),
    superAdminExists: vi.fn(async () => !!current),
    save: vi.fn(async (user) => user),
    createInitialSuperAdmin: vi.fn(
      async (input) =>
        (current = User.reconstitute({
          id: '00000000-0000-4000-8000-000000000001',
          email: input.email,
          firstName: null,
          lastName: null,
          status: UserStatus.ACTIVE,
          globalRole: GlobalRole.SUPER_ADMIN,
        })),
    ),
  };
  const events = { publish: vi.fn(async () => {}) };
  return {
    repository,
    events,
    useCase: new CreateSuperAdminUseCase(repository, events),
  };
}
describe('CreateSuperAdminUseCase', () => {
  it('creates once for concurrent calls and republishes on a later bootstrap', async () => {
    const { useCase, repository, events } = setup();
    await Promise.all([
      useCase.handle({ email: ' ADMIN@EXAMPLE.COM ' }),
      useCase.handle({ email: ' ADMIN@EXAMPLE.COM ' }),
    ]);
    expect(repository.createInitialSuperAdmin).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledTimes(1);
    await useCase.handle({ email: ' ADMIN@EXAMPLE.COM ' });
    expect(repository.createInitialSuperAdmin).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledTimes(2);
    expect(events.publish.mock.calls[0]).toEqual([
      expect.objectContaining({ email: 'admin@example.com' }),
    ]);
  });
  it('propagates Auth failure and permits repair on the next call', async () => {
    const { useCase, repository, events } = setup();
    events.publish.mockRejectedValueOnce(new Error('Auth failed'));
    await expect(
      useCase.handle({ email: ' ADMIN@EXAMPLE.COM ' }),
    ).rejects.toThrow('Auth failed');
    await expect(
      useCase.handle({ email: ' ADMIN@EXAMPLE.COM ' }),
    ).resolves.toBeUndefined();
    expect(repository.createInitialSuperAdmin).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid configuration before persistence or publication', async () => {
    const { repository, events } = setup();
    await expect(
      new CreateSuperAdminUseCase(repository, events).handle({
        email: 'invalid',
      }),
    ).rejects.toThrow('Invalid email');
    expect(repository.createInitialSuperAdmin).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });
});
