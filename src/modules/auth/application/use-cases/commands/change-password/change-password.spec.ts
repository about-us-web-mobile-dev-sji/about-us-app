import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePassword } from './change-password.js';
import { AuthIdentity } from '../../../../domain/entities/auth-identity.js';
import { AuthProvider } from '../../../../domain/enums/auth-provider.enums.js';
import { InvalidPasswordException } from '../../../../domain/exceptions/invalid-password.exception.js';
import { InvalidCredentialsException } from '../../../../domain/exceptions/invalid-credentials.exception.js';
import { PasswordChangeForbiddenException } from '../../../../domain/exceptions/password-change-forbidden.exception.js';
import type { AccessTokenGateway } from '../../../gateways/i-access-token.gateway.js';
import type { SessionValidator } from '../../../services/session-validator.service.js';
import type { AuthSubjectGateway } from '../../../gateways/i-auth-subject.gateway.js';
import type { AuthIdentityRepository } from '../../../../domain/repositories/auth-identity.repositories.js';

const input = {
  accessToken: 'token',
  currentPassword: 'old-password',
  newPassword: 'new-password-123',
};
const identity = AuthIdentity.reconstitute({
  id: 'identity',
  subjectId: 'admin',
  provider: AuthProvider.EMAIL,
  providerSubject: 'admin@example.com',
  passwordHash: 'old-hash',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastAuthenticatedAt: null,
});
const access = { verify: vi.fn() };
const validator = { validate: vi.fn() };
const subjects = { canChangePassword: vi.fn() };
const identities = { findBySubjectAndProvider: vi.fn() };
const passwords = { compare: vi.fn(), encrypt: vi.fn() };
const changes = { change: vi.fn() };
const useCase = new ChangePassword(
  access as unknown as AccessTokenGateway,
  validator as unknown as SessionValidator,
  subjects as unknown as AuthSubjectGateway,
  identities as unknown as AuthIdentityRepository,
  passwords,
  changes,
);
beforeEach(() => {
  vi.resetAllMocks();
  access.verify.mockResolvedValue({ sub: 'admin', sid: 'session' });
  validator.validate.mockResolvedValue({});
  subjects.canChangePassword.mockResolvedValue(true);
  identities.findBySubjectAndProvider.mockResolvedValue(identity);
  passwords.compare.mockImplementation(
    async (value: string) => value === input.currentPassword,
  );
  passwords.encrypt.mockResolvedValue('new-hash');
});
describe('ChangePassword', () => {
  it('verifies the current password and passes only hashes to atomic persistence', async () => {
    await expect(useCase.handle(input)).resolves.toBeUndefined();
    expect(validator.validate).toHaveBeenCalledWith({
      sub: 'admin',
      sid: 'session',
    });
    expect(changes.change).toHaveBeenCalledWith({
      identityId: 'identity',
      subjectId: 'admin',
      expectedHash: 'old-hash',
      passwordHash: 'new-hash',
    });
  });
  it('rejects a non-admin before reading or changing credentials', async () => {
    subjects.canChangePassword.mockResolvedValue(false);
    await expect(useCase.handle(input)).rejects.toBeInstanceOf(
      PasswordChangeForbiddenException,
    );
    expect(identities.findBySubjectAndProvider).not.toHaveBeenCalled();
    expect(changes.change).not.toHaveBeenCalled();
  });
  it('rejects invalid authentication and revoked sessions', async () => {
    validator.validate.mockRejectedValue(new Error('Invalid session'));
    await expect(useCase.handle(input)).rejects.toThrow('Invalid session');
    expect(changes.change).not.toHaveBeenCalled();
  });
  it('rejects incorrect current passwords', async () => {
    passwords.compare.mockResolvedValue(false);
    await expect(useCase.handle(input)).rejects.toBeInstanceOf(
      InvalidCredentialsException,
    );
    expect(passwords.encrypt).not.toHaveBeenCalled();
  });
  it('rejects accounts without an email identity', async () => {
    identities.findBySubjectAndProvider.mockResolvedValue(null);
    await expect(useCase.handle(input)).rejects.toBeInstanceOf(
      InvalidCredentialsException,
    );
    expect(changes.change).not.toHaveBeenCalled();
  });
  it.each(['short', ' '.repeat(12), 'é'.repeat(37), 'a'.repeat(73)])(
    'rejects invalid new password',
    async (newPassword) => {
      await expect(
        useCase.handle({ ...input, newPassword }),
      ).rejects.toBeInstanceOf(InvalidPasswordException);
      expect(changes.change).not.toHaveBeenCalled();
    },
  );
  it('rejects reusing the current password', async () => {
    passwords.compare.mockResolvedValue(true);
    await expect(useCase.handle(input)).rejects.toThrow('must differ');
    expect(changes.change).not.toHaveBeenCalled();
  });
  it('does not persist if hashing fails', async () => {
    passwords.encrypt.mockRejectedValue(new Error('hash failure'));
    await expect(useCase.handle(input)).rejects.toThrow('hash failure');
    expect(changes.change).not.toHaveBeenCalled();
  });
});
