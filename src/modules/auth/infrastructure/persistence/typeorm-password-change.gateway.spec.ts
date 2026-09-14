import { describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { TypeormPasswordChangeGateway } from './typeorm-password-change.gateway.js';
import { AuthIdentityEntity } from './typeorm/auth-identity.entity.js';
import { AuthSessionEntity } from './typeorm/auth-session.entity.js';
import { SessionStatus } from '../../domain/enums/session-status.enums.js';
import { PasswordChangeConflictException } from '../../domain/exceptions/password-change-conflict.exception.js';
const input = {
  identityId: 'identity',
  subjectId: 'admin',
  expectedHash: 'old',
  passwordHash: 'new',
};
describe('Atomic password change', () => {
  it('updates the hash conditionally and revokes sessions within the same transaction', async () => {
    const update = vi.fn().mockResolvedValue({ affected: 1 });
    const transaction = vi.fn(async (fn) => fn({ update }));
    await new TypeormPasswordChangeGateway({
      transaction,
    } as unknown as DataSource).change(input);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenNthCalledWith(
      1,
      AuthIdentityEntity,
      expect.objectContaining({ userId: 'admin', passwordHash: 'old' }),
      expect.objectContaining({ passwordHash: 'new' }),
    );
    expect(update).toHaveBeenNthCalledWith(
      2,
      AuthSessionEntity,
      { userId: 'admin', status: SessionStatus.ACTIVE },
      expect.objectContaining({
        status: SessionStatus.REVOKED,
        refreshTokenHash: null,
      }),
    );
  });
  it('rejects stale passwords without touching sessions', async () => {
    const update = vi.fn().mockResolvedValue({ affected: 0 });
    const transaction = async (
      fn: (m: { update: typeof update }) => Promise<void>,
    ) => fn({ update });
    await expect(
      new TypeormPasswordChangeGateway({
        transaction,
      } as unknown as DataSource).change(input),
    ).rejects.toBeInstanceOf(PasswordChangeConflictException);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
