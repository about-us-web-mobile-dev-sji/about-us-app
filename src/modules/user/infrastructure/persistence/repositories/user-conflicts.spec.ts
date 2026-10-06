import { describe, expect, it, vi } from 'vitest';
import { QueryFailedError, type Repository } from 'typeorm';
import { TypeormUserRepository } from './typeorm-user.repository.js';
import type { UserEntity } from '../entity/user.entity.js';
import { User } from '../../../domain/entities/user.entity.js';
import { UserEmailAlreadyUsedException } from '../../../domain/exceptions/user-email-already-used.exception.js';

describe('User persistence conflict translation', () => {
  it.each(['users_email_key', 'users_pkey'])('identifies the actual constraint %s', async (constraint) => {
    const error = new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate'), { code: '23505', constraint }));
    const repo = {
      save: vi.fn().mockRejectedValue(error),
      metadata: { uniques: [{ name: 'users_email_key', columns: [{ propertyName: 'email' }] }] },
    } as unknown as Repository<UserEntity>;
    const result = new TypeormUserRepository(repo).save(User.create({ email: 'a@example.com' }));
    if (constraint === 'users_email_key')
      await expect(result).rejects.toBeInstanceOf(UserEmailAlreadyUsedException);
    else await expect(result).rejects.toBe(error);
  });
});
