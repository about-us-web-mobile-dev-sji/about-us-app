import { describe, expect, it, vi } from 'vitest';
import { CreateSuperAdminIdentityUseCase } from './create-super-admin-identity.usecase.js';
import { MemoryAuthIdentityRepository } from '../../infrastructure/persistence/memory-auth-identity.repository.js';
import { AuthProvider } from '../../domain/enums/auth-provider.enums.js';

function setup() {
  const identities = new MemoryAuthIdentityRepository();
  const passwords = {
    encrypt: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  };
  return {
    identities,
    passwords,
    useCase: new CreateSuperAdminIdentityUseCase(identities, passwords),
  };
}
const input = {
  subjectId: 'admin-id',
  email: ' Admin@Example.com ',
  password: 'configured-password',
};

describe('CreateSuperAdminIdentityUseCase', () => {
  it('always creates EMAIL with a hash, even when extra provider fields are passed', async () => {
    const { identities, passwords, useCase } = setup();
    const untrustedInput = {
      ...input,
      provider: AuthProvider.GOOGLE,
      passwordHash: 'untrusted',
    };
    await useCase.handle(untrustedInput);
    const identity = (await identities.findByProvider(
      AuthProvider.EMAIL,
      'admin@example.com',
    ))!;
    expect(identity.toPrimitives()).toMatchObject({
      subjectId: 'admin-id',
      provider: AuthProvider.EMAIL,
      passwordHash: 'hashed-password',
    });
    expect(passwords.encrypt).toHaveBeenCalledWith(input.password);
    expect(
      await identities.findByProvider(AuthProvider.GOOGLE, 'admin@example.com'),
    ).toBeNull();
  });

  it('handles concurrent redelivery without duplicate identities or password reset', async () => {
    const { identities, passwords, useCase } = setup();
    await Promise.all([useCase.handle(input), useCase.handle(input)]);
    const identity = await identities.findByProvider(
      AuthProvider.EMAIL,
      'admin@example.com',
    );
    await useCase.handle({ ...input, password: 'changed-config-password' });
    expect(passwords.encrypt).toHaveBeenCalledOnce();
    expect(
      (await identities.findByProvider(AuthProvider.EMAIL, 'admin@example.com'))
        ?.id,
    ).toBe(identity?.id);
    await expect(
      useCase.handle({ ...input, subjectId: 'other-user' }),
    ).rejects.toThrow('belongs to another identity');
  });

  it.each(['', ' ', 'é'.repeat(37)])(
    'rejects missing or bcrypt-truncated passwords',
    async (password) => {
      const { identities, passwords, useCase } = setup();
      await expect(useCase.handle({ ...input, password })).rejects.toThrow(
        'SUPER_ADMIN_PASSWORD',
      );
      expect(passwords.encrypt).not.toHaveBeenCalled();
      expect(
        await identities.findByProvider(
          AuthProvider.EMAIL,
          'admin@example.com',
        ),
      ).toBeNull();
    },
  );
});
