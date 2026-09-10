import { describe, expect, it } from 'vitest';
import { User } from '../../../domain/entities/user.entity.js';
import { UserMapper } from './user.mapper.js';
describe('UserMapper', () => {
  it('round-trips global role, status, email and id without leaking ORM fields', () => {
    const user = User.createSuperAdmin({
      email: ' ADMIN@EXAMPLE.COM ',
      firstName: 'Admin',
    });
    user.block();
    const row = UserMapper.toPersistence(user);
    const restored = UserMapper.toDomain(
      Object.assign(row, { passwordHash: 'secret', identities: [] }),
    );
    expect(restored.id).toBe(row.id);
    expect(restored.status).toBe(user.status);
    expect(restored.globalRole).toBe(user.globalRole);
    expect(restored.email).toBe('admin@example.com');
    expect(JSON.stringify(restored)).not.toContain('secret');
  });
  it('rejects corrupted persisted role values', () => {
    const row = UserMapper.toPersistence(
      User.create({ email: 'a@example.com' }),
    );
    Object.assign(row, { globalRole: 'ROOT' });
    expect(() => UserMapper.toDomain(row)).toThrow(
      'Invalid user status or role',
    );
  });
});
