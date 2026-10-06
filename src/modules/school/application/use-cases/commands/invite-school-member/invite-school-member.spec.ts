import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteSchoolMemberUseCase } from './invite-school-member.js';
import { SchoolInvitation } from '../../../../domain/entities/school-invitation.entity.js';
import { InvitationStatus } from '../../../../domain/enums/invitation-status.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import { SchoolRoleNotFoundException } from '../../../../domain/exceptions/school-role-not-found.exception.js';
import type { SchoolInvitationRepository } from '../../../../domain/repositories/i-school-invitation.repository.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';
import {
  ROLE,
  SCHOOL_ID,
  customRole,
  defaultRoles,
  membershipOf,
  world,
} from '../../../testing/school-test-helpers.js';
import type { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';

describe('InviteSchoolMemberUseCase', () => {
  const inviter = customRole('role-inviter', 'Recruteur', [SchoolAction.INVITE_MEMBER]);
  const stranger = customRole('role-stranger', 'Étranger', [], 'other-school');
  const hrBoss = customRole('role-hr', 'RH', [SchoolAction.INVITE_MEMBER, SchoolAction.SUSPEND_MEMBER]);
  const roles = () => [...defaultRoles(), inviter, stranger, hrBoss];

  const emit = vi.fn();
  const setup = (
    members: SchoolMembership[],
    o: { blocked?: boolean; accounts?: Record<string, string>; schoolFound?: boolean } = {},
  ) => {
    const w = world(members, {
      roles: roles(),
      schoolStatus: o.blocked ? SchoolStatus.BLOCKED : SchoolStatus.ACTIVE,
    });
    let invitations: SchoolInvitation[] = [];
    let nextId = 1;
    const invitationRepo: SchoolInvitationRepository = {
      hasPendingForEmail: async () => false,
      findByTokenHash: async () => null,
      findPendingBySchoolAndEmail: async (sId, email) =>
        invitations.filter(
          (i) => i.schoolId === sId && i.email === email && i.status === InvitationStatus.PENDING,
        ),
      save: async (invitation) => {
        const saved = invitation.id
          ? invitation
          : SchoolInvitation.reconstitute({ ...invitation.toPrimitives(), id: `invitation-${nextId++}` });
        invitations = invitations.some((i) => i.id === saved.id)
          ? invitations.map((i) => (i.id === saved.id ? saved : i))
          : [...invitations, saved];
        return saved;
      },
    };
    const accounts = o.accounts ?? {};
    const users = {
      notificationRecipientByEmail: async (email: string) =>
        accounts[email] ? { id: accounts[email] } : null,
    } as unknown as UserAccountService;
    const schools = o.schoolFound === false ? { findById: async () => null } : w.schools;
    return {
      useCase: new InviteSchoolMemberUseCase(
        schools as never,
        invitationRepo,
        w.memberships.repo,
        w.roles.repo,
        users,
        { emit } as never,
        w.authorization,
      ),
      invitations: () => invitations,
    };
  };

  const base = { schoolId: SCHOOL_ID, email: 'new@ecole.test' };

  beforeEach(() => emit.mockClear());

  it('lets the administrator invite and defaults to the student role', async () => {
    const ctx = setup([membershipOf('admin', [ROLE.admin])]);
    const { invitation } = await ctx.useCase.handle({ ...base, performedBy: 'admin' });

    expect(invitation.roleId).toBe(ROLE.student);
    expect(invitation.status).toBe(InvitationStatus.PENDING);
    expect(emit).toHaveBeenCalledWith('invitation.sent', expect.objectContaining({ schoolId: SCHOOL_ID }));
    expect(JSON.stringify(invitation)).not.toMatch(/token/i);
  });

  it('lets the administrator invite with the staff role or a custom role', async () => {
    const ctx = setup([membershipOf('admin', [ROLE.admin])]);
    const staff = await ctx.useCase.handle({ ...base, roleId: ROLE.staff, performedBy: 'admin' });
    const custom = await ctx.useCase.handle({ ...base, roleId: 'role-inviter', performedBy: 'admin' });
    expect(staff.invitation.roleId).toBe(ROLE.staff);
    expect(custom.invitation.roleId).toBe('role-inviter');
  });

  it('lets a member whose role carries INVITE_MEMBER invite', async () => {
    const ctx = setup([membershipOf('hr', ['role-inviter'])]);
    await expect(ctx.useCase.handle({ ...base, performedBy: 'hr' })).resolves.toBeDefined();
  });

  it.each([
    ['a student', [ROLE.student]],
    ['a staff member', [ROLE.staff]],
  ])('refuses %s', async (_label, roleIds) => {
    const ctx = setup([membershipOf('u', roleIds)]);
    await expect(ctx.useCase.handle({ ...base, performedBy: 'u' })).rejects.toBeInstanceOf(
      SchoolMembershipActionForbiddenException,
    );
  });

  it('refuses someone who is not a member of the school', async () => {
    const ctx = setup([]);
    await expect(ctx.useCase.handle({ ...base, performedBy: 'ghost' })).rejects.toBeInstanceOf(
      SchoolMembershipActionForbiddenException,
    );
  });

  it('refuses a suspended administrator', async () => {
    const ctx = setup([membershipOf('admin', [ROLE.admin], MembershipStatus.SUSPENDED)]);
    await expect(ctx.useCase.handle({ ...base, performedBy: 'admin' })).rejects.toBeInstanceOf(
      SchoolMembershipActionForbiddenException,
    );
  });

  it('never gives the administrator role through an invitation', async () => {
    const ctx = setup([membershipOf('admin', [ROLE.admin])]);
    await expect(
      ctx.useCase.handle({ ...base, roleId: ROLE.admin, performedBy: 'admin' }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
    expect(emit).not.toHaveBeenCalled();
  });

  it('refuses a role the inviter could not hand out itself (anti-escalation)', async () => {
    const ctx = setup([membershipOf('hr', ['role-inviter'])]);
    await expect(
      ctx.useCase.handle({ ...base, roleId: 'role-hr', performedBy: 'hr' }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('refuses an unknown role and a role of another school', async () => {
    const ctx = setup([membershipOf('admin', [ROLE.admin])]);
    for (const roleId of ['nope', 'role-stranger']) {
      await expect(
        ctx.useCase.handle({ ...base, roleId, performedBy: 'admin' }),
      ).rejects.toBeInstanceOf(SchoolRoleNotFoundException);
    }
  });

  it('refuses an invalid email', async () => {
    const ctx = setup([membershipOf('admin', [ROLE.admin])]);
    await expect(
      ctx.useCase.handle({ ...base, email: 'not-an-email', performedBy: 'admin' }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });

  it('refuses everybody when the school is blocked, and an unknown school', async () => {
    const blocked = setup([membershipOf('admin', [ROLE.admin])], { blocked: true });
    await expect(blocked.useCase.handle({ ...base, performedBy: 'admin' })).rejects.toBeInstanceOf(
      InvalidSchoolException,
    );
    const missing = setup([], { schoolFound: false });
    await expect(missing.useCase.handle({ ...base, performedBy: 'admin' })).rejects.toBeInstanceOf(
      SchoolNotFoundException,
    );
  });

  describe('people who already have a membership', () => {
    const accounts = { 'new@ecole.test': 'invitee' };

    it.each([
      ['active', MembershipStatus.ACTIVE],
      ['suspended', MembershipStatus.SUSPENDED],
      ['revoked', MembershipStatus.REVOKED],
    ])('refuses an %s member', async (_label, status) => {
      const ctx = setup([membershipOf('admin', [ROLE.admin]), membershipOf('invitee', [ROLE.student], status)], {
        accounts,
      });
      await expect(ctx.useCase.handle({ ...base, performedBy: 'admin' })).rejects.toThrow();
    });

    it('accepts an inactive member', async () => {
      const ctx = setup(
        [membershipOf('admin', [ROLE.admin]), membershipOf('invitee', [ROLE.student], MembershipStatus.INACTIVE)],
        { accounts },
      );
      await expect(ctx.useCase.handle({ ...base, performedBy: 'admin' })).resolves.toBeDefined();
    });
  });

  it('cancels earlier pending invitations when inviting the same address again', async () => {
    const ctx = setup([membershipOf('admin', [ROLE.admin])]);
    await ctx.useCase.handle({ ...base, performedBy: 'admin' });
    await ctx.useCase.handle({ ...base, performedBy: 'admin' });
    const statuses = ctx.invitations().map((i) => i.status);
    expect(statuses).toEqual([InvitationStatus.CANCELLED, InvitationStatus.PENDING]);
  });
});
