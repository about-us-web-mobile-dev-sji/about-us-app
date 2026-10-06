import { describe, expect, it, vi } from 'vitest';
import { CreateSuperAdminIdentityUseCase } from './CreateSuperAdminIdentity.js';
import {
  AuthIdentity,
  type NewAuthIdentity,
} from '../../../../domain/entities/auth-identity.js';
import { AuthProvider } from '../../../../domain/enums/auth-provider.enums.js';
import type { AuthIdentityRepository } from '../../../../domain/repositories/auth-identity.repositories.js';
const input = {
  subjectId: 'admin-id',
  email: ' ADMIN@EXAMPLE.COM ',
  password: 'Initial password',
};
function setup() {
  let current: AuthIdentity | null = null;
  const identities = {
    findById: vi.fn(async () => current),
    findBySubjectAndProvider: vi.fn(async () => current),
    findByProvider: vi.fn(async () => current),
    create: vi.fn<AuthIdentityRepository['create']>(),
    save: vi.fn<AuthIdentityRepository['save']>(),
    createIfAbsent: vi.fn(
      async (value: NewAuthIdentity) =>
        (current ??= AuthIdentity.reconstitute({
          ...value,
          id: 'identity-id',
        })),
    ),
  } satisfies AuthIdentityRepository;
  const passwords = {
    encrypt: vi.fn(async () => 'hashed-password'),
    compare: vi.fn(async () => true),
  };
  return {
    identities,
    passwords,
    useCase: new CreateSuperAdminIdentityUseCase(identities, passwords),
  };
}
describe('CreateSuperAdminIdentityUseCase', () => {
  it('creates only EMAIL credentials and never sends the plaintext password to persistence', async () => {
    const { useCase, identities, passwords } = setup();
    await useCase.handle(input);
    expect(passwords.encrypt).toHaveBeenCalledWith(input.password);
    expect(identities.createIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: input.subjectId,
        provider: AuthProvider.EMAIL,
        providerSubject: 'admin@example.com',
        passwordHash: 'hashed-password',
      }),
    );
    expect(JSON.stringify(identities.createIfAbsent.mock.calls)).not.toContain(
      input.password,
    );
  });
  it('preserves an existing password on redelivery even with a changed or absent configuration', async () => {
    const { useCase, identities, passwords } = setup();
    await useCase.handle(input);
    await useCase.handle({ ...input, password: 'Replacement password' });
    await useCase.handle({ ...input, password: '' });
    expect(identities.createIfAbsent).toHaveBeenCalledTimes(1);
    expect(passwords.encrypt).toHaveBeenCalledTimes(1);
  });
  it('serializes local concurrent deliveries without resetting credentials', async () => {
    const { useCase, identities, passwords } = setup();
    await Promise.all([useCase.handle(input), useCase.handle(input)]);
    expect(identities.createIfAbsent).toHaveBeenCalledTimes(1);
    expect(passwords.encrypt).toHaveBeenCalledTimes(1);
  });
  it.each(['', '   ', 'é'.repeat(37)])(
    'rejects missing or oversized UTF-8 passwords',
    async (password) => {
      const { useCase, passwords, identities } = setup();
      await expect(useCase.handle({ ...input, password })).rejects.toThrow(
        'SUPER_ADMIN_PASSWORD',
      );
      expect(passwords.encrypt).not.toHaveBeenCalled();
      expect(identities.createIfAbsent).not.toHaveBeenCalled();
    },
  );
  it('propagates persistence failure and allows the next delivery to repair it', async () => {
    const { useCase, identities } = setup();
    identities.createIfAbsent.mockRejectedValueOnce(
      new Error('Database unavailable'),
    );
    await expect(useCase.handle(input)).rejects.toThrow('Database unavailable');
    await expect(useCase.handle(input)).resolves.toBeUndefined();
    expect(identities.createIfAbsent).toHaveBeenCalledTimes(2);
  });
  it('rejects an email already owned by another user', async () => {
    const { useCase, passwords } = setup();
    await useCase.handle(input);
    await expect(
      useCase.handle({ ...input, subjectId: 'other-user' }),
    ).rejects.toThrow('belongs to another identity');
    expect(passwords.encrypt).toHaveBeenCalledTimes(1);
  });
});
