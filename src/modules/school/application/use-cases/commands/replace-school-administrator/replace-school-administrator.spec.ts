import { describe, expect, it, vi } from 'vitest';
import { ReplaceSchoolAdministratorUseCase } from './replace-school-administrator.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidReplacementException } from '../../../../domain/exceptions/invalid-replacement.exception.js';
import { SchoolAdministratorNotFoundException } from '../../../../domain/exceptions/school-administrator-not-found.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import { ROLE, inMemoryMemberships, inMemoryRoles } from '../../../testing/school-test-helpers.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';

describe('ReplaceSchoolAdministratorUseCase', () => {
  const schoolId = '11111111-1111-4111-8111-111111111111';
  const oldAdminId = '22222222-2222-4222-8222-222222222222';
  const newAdminId = '33333333-3333-4333-8333-333333333333';
  const performedBy = 'super-admin';

  const school = School.reconstitute({
    id: schoolId,
    name: 'École test',
    phoneNumber: null,
    email: null,
    website: null,
    status: SchoolStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: performedBy,
  });

  const ADMIN = 'ADMIN';
  const MEMBER = 'MEMBER';
  const membership = (
    userId: string,
    role: typeof ADMIN | typeof MEMBER,
    status = MembershipStatus.ACTIVE,
  ) =>
    SchoolMembership.reconstitute({
      id: `membership-${userId}`,
      schoolId,
      userId,
      roleIds: [role === ADMIN ? ROLE.admin : ROLE.student],
      status,
      grantedBy: performedBy,
      grantedAt: new Date(),
      revokedAt: null,
      revokedBy: null,
    });

  const setup = (initial: SchoolMembership[], existingUsers = [newAdminId]) => {
    const store = inMemoryMemberships(initial);
    const schools = {
      findById: async (id: string) => (id === schoolId ? school : null),
    } as unknown as SchoolRepository;
    const memberships = store.repo;
    const roles = inMemoryRoles();
    const users = {
      exists: async (id: string) => existingUsers.includes(id),
    } as unknown as UserAccountService;
    const roleChanged = vi.fn();
    return {
      useCase: new ReplaceSchoolAdministratorUseCase(
        schools,
        memberships,
        roles.repo,
        users,
        roleChanged,
      ),
      all: () => store.all(),
      roleChanged,
    };
  };

  it('revokes the previous admin membership and appoints a brand new admin', async () => {
    const ctx = setup([membership(oldAdminId, ADMIN)]);

    const out = await ctx.useCase.handle({
      schoolId,
      newAdminUserId: newAdminId,
      performedBy,
    });

    expect(out).toMatchObject({
      previousAdminUserId: oldAdminId,
      newAdminUserId: newAdminId,
      membershipRevoked: true,
      newMembershipCreated: true,
    });
    const old = ctx.all().find((m) => m.userId === oldAdminId)!;
    expect(old.status).toBe(MembershipStatus.REVOKED);
    expect(old.revokedBy).toBe(performedBy);
    const created = ctx.all().find((m) => m.userId === newAdminId)!;
    expect(created.roleIds).toContain(ROLE.admin);
    expect(created.status).toBe(MembershipStatus.ACTIVE);
  });

  it('works for a school that has no administrator yet', async () => {
    const ctx = setup([]);

    const out = await ctx.useCase.handle({
      schoolId,
      newAdminUserId: newAdminId,
      performedBy,
    });

    expect(out.previousAdminUserId).toBeNull();
    expect(out.membershipRevoked).toBe(false);
    expect(ctx.all()).toHaveLength(1);
  });

  it('also replaces a suspended admin', async () => {
    const ctx = setup([
      membership(oldAdminId, ADMIN, MembershipStatus.SUSPENDED),
    ]);

    const out = await ctx.useCase.handle({
      schoolId,
      newAdminUserId: newAdminId,
      performedBy,
    });

    expect(out.previousAdminUserId).toBe(oldAdminId);
    expect(
      ctx.all().find((m) => m.userId === oldAdminId)!.status,
    ).toBe(MembershipStatus.REVOKED);
  });

  it('promotes an existing member, reactivating an inactive or suspended membership', async () => {
    for (const status of [MembershipStatus.INACTIVE, MembershipStatus.SUSPENDED]) {
      const ctx = setup([
        membership(oldAdminId, ADMIN),
        membership(newAdminId, MEMBER, status),
      ]);

      const out = await ctx.useCase.handle({
        schoolId,
        newAdminUserId: newAdminId,
        performedBy,
      });

      const promoted = ctx.all().find((m) => m.userId === newAdminId)!;
      expect(promoted.roleIds).toEqual([ROLE.student, ROLE.admin]);
      expect(promoted.status).toBe(MembershipStatus.ACTIVE);
      expect(out.newMembershipCreated).toBe(false);
    }
  });

  it('refuses a revoked member and leaves the current admin untouched', async () => {
    const ctx = setup([
      membership(oldAdminId, ADMIN),
      membership(newAdminId, MEMBER, MembershipStatus.REVOKED),
    ]);

    await expect(
      ctx.useCase.handle({ schoolId, newAdminUserId: newAdminId, performedBy }),
    ).rejects.toBeInstanceOf(InvalidReplacementException);

    expect(
      ctx.all().find((m) => m.userId === oldAdminId)!.status,
    ).toBe(MembershipStatus.ACTIVE);
    expect(ctx.roleChanged).not.toHaveBeenCalled();
  });

  it('refuses when the new admin already is the active administrator', async () => {
    const ctx = setup([membership(newAdminId, ADMIN)]);

    await expect(
      ctx.useCase.handle({ schoolId, newAdminUserId: newAdminId, performedBy }),
    ).rejects.toBeInstanceOf(InvalidReplacementException);
  });

  it('notifies both the previous and the new admin', async () => {
    const ctx = setup([membership(oldAdminId, ADMIN)]);

    await ctx.useCase.handle({ schoolId, newAdminUserId: newAdminId, performedBy });

    expect(ctx.roleChanged).toHaveBeenCalledTimes(1);
    expect(ctx.roleChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId,
        schoolName: 'École test',
        recipientIds: [oldAdminId, newAdminId],
      }),
    );
  });

  it('rejects an unknown school and an unknown user', async () => {
    const ctx = setup([]);

    await expect(
      ctx.useCase.handle({
        schoolId: '99999999-9999-4999-8999-999999999999',
        newAdminUserId: newAdminId,
        performedBy,
      }),
    ).rejects.toBeInstanceOf(SchoolNotFoundException);

    await expect(
      ctx.useCase.handle({ schoolId, newAdminUserId: '44444444-4444-4444-8444-444444444444', performedBy }),
    ).rejects.toBeInstanceOf(SchoolAdministratorNotFoundException);
  });
});
