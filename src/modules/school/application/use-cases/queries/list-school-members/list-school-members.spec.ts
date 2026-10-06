import { describe, expect, it, vi } from 'vitest';
import { ListSchoolMembersUseCase } from './list-school-members.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';
import {
  ROLE,
  SCHOOL_ID,
  customRole,
  defaultRoles,
  membershipOf,
  world,
} from '../../../testing/school-test-helpers.js';

describe('ListSchoolMembersUseCase', () => {
  const detailer = customRole('role-detail', 'Secrétaire', [SchoolAction.VIEW_MEMBER_DETAILS]);
  const users = {
    authenticationProfile: async (id: string) => ({
      email: `${id}@ecole.test`,
      firstName: id.toUpperCase(),
      lastName: 'Test',
    }),
  } as unknown as UserAccountService;

  const setup = () => {
    const w = world(
      [
        membershipOf('student', [ROLE.student]),
        membershipOf('admin', [ROLE.admin]),
        membershipOf('staff', [ROLE.staff, ROLE.student]),
        membershipOf('secretary', ['role-detail']),
        membershipOf('suspended', [ROLE.student], MembershipStatus.SUSPENDED),
        membershipOf('revoked', [ROLE.student], MembershipStatus.REVOKED),
      ],
      { roles: [...defaultRoles(), detailer] },
    );
    const paginated = vi.spyOn(w.memberships.repo, 'findBySchoolPaginated');
    const useCase = new ListSchoolMembersUseCase(
      w.schools,
      w.memberships.repo,
      w.roles.repo,
      w.authorization,
      users,
    );
    return { useCase, paginated };
  };

  it('gives the administrator the full view with named roles, without revoked members', async () => {
    const { useCase } = setup();
    const out = await useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'admin' });

    expect(out.view).toBe('full');
    const items = out.items as Array<{ userId: string; email: string | null; roles: Array<{ name: string }> }>;
    expect(items.map((m) => m.userId)).toContain('admin');
    expect(items.map((m) => m.userId)).not.toContain('revoked');
    expect(items.find((m) => m.userId === 'suspended')).toBeDefined();
    expect(items.find((m) => m.userId === 'staff')?.roles.map((r) => r.name).sort()).toEqual(['Personnel', 'Élève']);
    expect(items.find((m) => m.userId === 'admin')?.email).toBe('admin@ecole.test');
    expect(out).toMatchObject({ page: 1, limit: 20, total: items.length, totalPages: 1 });
  });

  it('filters by status and role in the full view', async () => {
    const { useCase } = setup();
    const revoked = await useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'admin', status: MembershipStatus.REVOKED });
    expect(revoked.items.map((m) => m.userId)).toEqual(['revoked']);
    const staff = await useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'admin', roleId: ROLE.staff });
    expect(staff.items.map((m) => m.userId)).toEqual(['staff']);
  });

  it('paginates', async () => {
    const { useCase } = setup();
    const first = await useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'admin', pagination: { page: 1, limit: 2 } });
    const second = await useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'admin', pagination: { page: 2, limit: 2 } });
    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(2);
    expect(first.totalPages).toBe(3);
    expect(first.total).toBe(5);
    expect(first.items.map((m) => m.userId)).not.toEqual(second.items.map((m) => m.userId));
  });

  it('forwards the search, and searches emails only in the full view', async () => {
    const { useCase, paginated } = setup();
    await useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'admin', search: '  ali  ' });
    expect(paginated).toHaveBeenLastCalledWith(
      SCHOOL_ID,
      expect.objectContaining({ search: 'ali', includeEmailInSearch: true }),
      { page: 1, limit: 20 },
    );
    await useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'staff', search: 'ali' });
    expect(paginated).toHaveBeenLastCalledWith(
      SCHOOL_ID,
      expect.objectContaining({ search: 'ali', includeEmailInSearch: false }),
      { page: 1, limit: 20 },
    );
  });

  it('gives VIEW_MEMBER_DETAILS holders the full view', async () => {
    const { useCase } = setup();
    expect((await useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'secretary' })).view).toBe('full');
  });

  it('gives VIEW_MEMBERS holders a reduced view: active members only, roles, no email, no status', async () => {
    const { useCase } = setup();
    const out = await useCase.handle({
      schoolId: SCHOOL_ID,
      performedBy: 'staff',
      status: MembershipStatus.SUSPENDED,
    });

    expect(out.view).toBe('reduced');
    const ids = out.items.map((m) => m.userId);
    expect(ids).toContain('admin');
    expect(ids).not.toContain('suspended');
    expect(ids).not.toContain('revoked');
    for (const member of out.items) {
      expect(member).not.toHaveProperty('email');
      expect(member).not.toHaveProperty('status');
      expect(member).toHaveProperty('roles');
    }
  });

  it('refuses a student, a suspended administrator and a stranger', async () => {
    const { useCase } = setup();
    for (const performedBy of ['student', 'suspended', 'ghost']) {
      await expect(useCase.handle({ schoolId: SCHOOL_ID, performedBy })).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
    }
  });

  it.each([
    [{ pagination: { page: 0, limit: 10 } }],
    [{ pagination: { page: 1, limit: 0 } }],
    [{ pagination: { page: 1, limit: 101 } }],
    [{ roleId: '  ' }],
    [{ search: 'x'.repeat(201) }],
  ])('rejects invalid parameters %j', async (extra) => {
    const { useCase } = setup();
    await expect(
      useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'admin', ...extra }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });

  it('rejects an unknown school', async () => {
    const w = world([membershipOf('admin', [ROLE.admin])]);
    const useCase = new ListSchoolMembersUseCase(
      { findById: async () => null } as never,
      w.memberships.repo,
      w.roles.repo,
      w.authorization,
      users,
    );
    await expect(useCase.handle({ schoolId: SCHOOL_ID, performedBy: 'admin' })).rejects.toBeInstanceOf(
      SchoolNotFoundException,
    );
  });
});
