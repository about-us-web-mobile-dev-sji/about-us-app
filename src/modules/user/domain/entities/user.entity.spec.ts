import { GlobalRole } from '../enum/global-role.enum.js';
import { describe, expect, it } from 'vitest';
import { User } from './user.entity.js';
import UserStatus from '../enum/user-status.enum.js';

describe('User', () => {
  it('creates an active user with optional names and no database identifier', () => {
    const user = User.create({ email: 'alice@example.com' });
    expect(user.id).toBeUndefined();
    expect(user.globalRole).toBe(GlobalRole.USER);
    expect(user.email).toBe('alice@example.com');
    expect(user.firstName).toBeNull();
    expect(user.lastName).toBeNull();
    expect(user.status).toBe(UserStatus.ACTIVE);
  });

  it('preserves names supplied at creation', () => {
    const user = User.create({
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Doe',
    });
    expect(user.firstName).toBe('Alice');
    expect(user.lastName).toBe('Doe');
  });

  it('restores a persisted user', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const user = User.reconstitute({
      id,
      firstName: 'Alice',
      lastName: 'Doe',
      email: 'alice@example.com',
      status: UserStatus.SUSPENDED,
      globalRole: GlobalRole.SUPER_ADMIN,
    });
    expect(user.id).toBe(id);
    expect(user.firstName).toBe('Alice');
    expect(user.lastName).toBe('Doe');
    expect(user.email).toBe('alice@example.com');
    expect(user.status).toBe(UserStatus.SUSPENDED);
  });

  it('blocks and reactivates a user, including repeated calls', () => {
    const user = User.create({ email: 'alice@example.com' });
    user.block();
    expect(user.status).toBe(UserStatus.SUSPENDED);
    user.block();
    expect(user.status).toBe(UserStatus.SUSPENDED);
    user.activate();
    expect(user.status).toBe(UserStatus.ACTIVE);
    user.activate();
    expect(user.status).toBe(UserStatus.ACTIVE);
  });
  it('creates a super admin with the global role and an active status', () => {
    const user = User.createSuperAdmin({ email: 'admin@example.com' });
    expect(user.globalRole).toBe(GlobalRole.SUPER_ADMIN);
    expect(user.status).toBe(UserStatus.ACTIVE);
  });
});
