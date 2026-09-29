import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptSchoolInvitation } from './accept-school-invitation.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolInvitation } from '../../../../domain/entities/school-invitation.entity.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { InvitationStatus } from '../../../../domain/enums/invitation-status.enum.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { SchoolAdministratorAlreadyAssignedException } from '../../../../domain/exceptions/school-administrator-already-assigned.exception.js';
import { SchoolInvitationInvalidException } from '../../../../domain/exceptions/school-invitation-invalid.exception.js';
import { SchoolInvitationMismatchException } from '../../../../domain/exceptions/school-invitation-mismatch.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolInvitationRepository } from '../../../../domain/repositories/i-school-invitation.repository.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';

describe('AcceptSchoolInvitation', () => {
  const schoolId = '11111111-1111-4111-8111-111111111111';
  const invitedUserId = '22222222-2222-4222-8222-222222222222';
  const otherUserId = '33333333-3333-4333-8333-333333333333';
  const inviterId = '44444444-4444-4444-8444-444444444444';
  const invitedEmail = 'admin@ecole.test';

  const makeSchool = (status = SchoolStatus.ACTIVE) =>
    School.reconstitute({
      id: schoolId,
      name: 'École test',
      address: null,
      phoneNumber: null,
      email: invitedEmail,
      website: null,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: inviterId,
    });

  const issue = (
    overrides: {
      email?: string;
      ttlMs?: number;
      schoolId?: string;
      role?: MembershipRole;
    } = {},
  ) => {
    const { invitation, token } = SchoolInvitation.issue({
      schoolId: overrides.schoolId ?? schoolId,
      email: overrides.email ?? invitedEmail,
      role: overrides.role ?? MembershipRole.SCHOOL_ADMIN,
      invitedBy: inviterId,
      ttlMs: overrides.ttlMs,
    });
    return {
      invitation: SchoolInvitation.reconstitute({
        ...invitation.toPrimitives(),
        id: 'invitation-1',
      }),
      token,
    };
  };

  const membership = (o: {
    userId: string;
    role?: MembershipRole;
    status?: MembershipStatus;
  }) =>
    SchoolMembership.reconstitute({
      id: `membership-${o.userId}`,
      schoolId,
      userId: o.userId,
      role: o.role ?? MembershipRole.SCHOOL_MEMBER,
      status: o.status ?? MembershipStatus.ACTIVE,
      grantedBy: inviterId,
      grantedAt: new Date(),
      revokedAt: null,
      revokedBy: null,
    });

  const setup = (o: {
    school?: School | null;
    invitations?: SchoolInvitation[];
    memberships?: SchoolMembership[];
    accounts?: Record<string, string>;
  }) => {
    const school = o.school === undefined ? makeSchool() : o.school;
    let invitations = [...(o.invitations ?? [])];
    let memberships = [...(o.memberships ?? [])];
    let nextId = 1;

    const schools = {
      findById: async (id: string) =>
        school && school.id === id ? school : null,
    } as unknown as SchoolRepository;

    const invitationRepo: SchoolInvitationRepository = {
      findByTokenHash: async (hash) =>
        invitations.find((i) => i.toPrimitives().tokenHash === hash) ?? null,
      findPendingBySchoolAndEmail: async () => [],
      save: async (invitation) => {
        invitations = invitations.map((i) =>
          i.id === invitation.id ? invitation : i,
        );
        return invitation;
      },
    };

    const membershipRepo: SchoolMembershipRepository = {
      findById: async (id) => memberships.find((m) => m.id === id) ?? null,
      findBySchoolAndUser: async (sId, userId) =>
        memberships.find((m) => m.schoolId === sId && m.userId === userId) ??
        null,
      findActiveAdminBySchool: async (sId) =>
        memberships.find(
          (m) =>
            m.schoolId === sId &&
            m.role === MembershipRole.SCHOOL_ADMIN &&
            m.status === MembershipStatus.ACTIVE,
        ) ?? null,
      findBySchool: async (sId) => memberships.filter((m) => m.schoolId === sId),
      save: async (m) => {
        const saved = m.id
          ? m
          : SchoolMembership.reconstitute({
              ...m.toPrimitives(),
              id: `new-membership-${nextId++}`,
            });
        memberships = memberships.some((x) => x.id === saved.id)
          ? memberships.map((x) => (x.id === saved.id ? saved : x))
          : [...memberships, saved];
        return saved;
      },
    };

    const accounts = o.accounts ?? { [invitedUserId]: invitedEmail };
    const users = {
      authenticationProfile: async (id: string) =>
        accounts[id] ? { id, email: accounts[id] } : null,
    } as unknown as UserAccountService;

    const emitter = { emit: vi.fn() };

    return {
      useCase: new AcceptSchoolInvitation(
        schools,
        invitationRepo,
        membershipRepo,
        users,
        emitter as never,
      ),
      emitter,
      memberships: () => memberships,
      invitations: () => invitations,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links the invitee as school admin through a membership and consumes the invitation', async () => {
    const { invitation, token } = issue();
    const ctx = setup({ invitations: [invitation] });

    const { school, membership: created } = await ctx.useCase.handle({
      schoolId,
      token,
      userId: invitedUserId,
    });

    expect(school.name).toBe('École test');
    expect(created.userId).toBe(invitedUserId);
    expect(created.role).toBe(MembershipRole.SCHOOL_ADMIN);
    expect(created.status).toBe(MembershipStatus.ACTIVE);
    expect(created.grantedBy).toBe(inviterId);
    expect(ctx.memberships()).toHaveLength(1);
    expect(ctx.invitations()[0].status).toBe(InvitationStatus.ACCEPTED);
    expect(ctx.emitter.emit).toHaveBeenCalledTimes(1);
    expect(ctx.emitter.emit).toHaveBeenCalledWith(
      'invitation.accepted',
      expect.objectContaining({
        inviterId,
        schoolId,
        schoolName: 'École test',
        adminUserId: invitedUserId,
      }),
    );
  });

  it('matches the invited email case-insensitively', async () => {
    const { invitation, token } = issue();
    const ctx = setup({
      invitations: [invitation],
      accounts: { [invitedUserId]: 'ADMIN@ECOLE.TEST' },
    });

    const { membership: created } = await ctx.useCase.handle({
      schoolId,
      token,
      userId: invitedUserId,
    });

    expect(created.role).toBe(MembershipRole.SCHOOL_ADMIN);
  });

  it('promotes an existing member and reactivates a suspended membership', async () => {
    const { invitation, token } = issue();
    const ctx = setup({
      invitations: [invitation],
      memberships: [
        membership({ userId: invitedUserId, status: MembershipStatus.SUSPENDED }),
      ],
    });

    const { membership: promoted } = await ctx.useCase.handle({
      schoolId,
      token,
      userId: invitedUserId,
    });

    expect(promoted.role).toBe(MembershipRole.SCHOOL_ADMIN);
    expect(promoted.status).toBe(MembershipStatus.ACTIVE);
    expect(ctx.memberships()).toHaveLength(1);
  });

  it('rejects an unknown token', async () => {
    const { invitation } = issue();
    const ctx = setup({ invitations: [invitation] });

    await expect(
      ctx.useCase.handle({ schoolId, token: 'f'.repeat(64), userId: invitedUserId }),
    ).rejects.toBeInstanceOf(SchoolInvitationInvalidException);
    expect(ctx.memberships()).toHaveLength(0);
  });

  it("rejects a token issued for another school", async () => {
    const { invitation, token } = issue({
      schoolId: '99999999-9999-4999-8999-999999999999',
    });
    const ctx = setup({ invitations: [invitation] });

    await expect(
      ctx.useCase.handle({ schoolId, token, userId: invitedUserId }),
    ).rejects.toBeInstanceOf(SchoolInvitationInvalidException);
    expect(ctx.memberships()).toHaveLength(0);
  });

  it('rejects an expired invitation', async () => {
    const { invitation, token } = issue({ ttlMs: -1000 });
    const ctx = setup({ invitations: [invitation] });

    await expect(
      ctx.useCase.handle({ schoolId, token, userId: invitedUserId }),
    ).rejects.toBeInstanceOf(SchoolInvitationInvalidException);
    expect(ctx.memberships()).toHaveLength(0);
  });

  it('rejects a token that has already been used', async () => {
    const { invitation, token } = issue();
    const ctx = setup({ invitations: [invitation] });

    await ctx.useCase.handle({ schoolId, token, userId: invitedUserId });

    await expect(
      ctx.useCase.handle({ schoolId, token, userId: invitedUserId }),
    ).rejects.toBeInstanceOf(SchoolInvitationInvalidException);
    expect(ctx.emitter.emit).toHaveBeenCalledTimes(1);
  });

  it('rejects a valid token presented by an account with another email', async () => {
    const { invitation, token } = issue();
    const ctx = setup({
      invitations: [invitation],
      accounts: { [otherUserId]: 'someone-else@example.com' },
    });

    await expect(
      ctx.useCase.handle({ schoolId, token, userId: otherUserId }),
    ).rejects.toBeInstanceOf(SchoolInvitationMismatchException);
    expect(ctx.memberships()).toHaveLength(0);
    expect(ctx.invitations()[0].status).toBe(InvitationStatus.PENDING);
  });

  it('rejects when the accepting account cannot be found', async () => {
    const { invitation, token } = issue();
    const ctx = setup({ invitations: [invitation], accounts: {} });

    await expect(
      ctx.useCase.handle({ schoolId, token, userId: otherUserId }),
    ).rejects.toBeInstanceOf(SchoolInvitationMismatchException);
  });

  it('rejects acceptance when the school is blocked', async () => {
    const { invitation, token } = issue();
    const ctx = setup({
      school: makeSchool(SchoolStatus.BLOCKED),
      invitations: [invitation],
    });

    await expect(
      ctx.useCase.handle({ schoolId, token, userId: invitedUserId }),
    ).rejects.toBeInstanceOf(InvalidSchoolException);
  });

  it('throws when the school does not exist', async () => {
    const { invitation, token } = issue();
    const ctx = setup({ school: null, invitations: [invitation] });

    await expect(
      ctx.useCase.handle({ schoolId, token, userId: invitedUserId }),
    ).rejects.toBeInstanceOf(SchoolNotFoundException);
  });

  it('rejects when the school already has another administrator', async () => {
    const { invitation, token } = issue();
    const ctx = setup({
      invitations: [invitation],
      memberships: [
        membership({ userId: otherUserId, role: MembershipRole.SCHOOL_ADMIN }),
      ],
    });

    await expect(
      ctx.useCase.handle({ schoolId, token, userId: invitedUserId }),
    ).rejects.toBeInstanceOf(SchoolAdministratorAlreadyAssignedException);
    expect(ctx.invitations()[0].status).toBe(InvitationStatus.PENDING);
  });

  it('never resurrects a revoked membership', async () => {
    const { invitation, token } = issue();
    const ctx = setup({
      invitations: [invitation],
      memberships: [
        membership({ userId: invitedUserId, status: MembershipStatus.REVOKED }),
      ],
    });

    await expect(
      ctx.useCase.handle({ schoolId, token, userId: invitedUserId }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    expect(ctx.memberships()[0].status).toBe(MembershipStatus.REVOKED);
    expect(ctx.invitations()[0].status).toBe(InvitationStatus.PENDING);
  });

  describe('member invitations', () => {
    it('adds the invitee as a plain member, even when the school has an admin', async () => {
      const { invitation, token } = issue({ role: MembershipRole.SCHOOL_MEMBER });
      const ctx = setup({
        invitations: [invitation],
        memberships: [
          membership({ userId: otherUserId, role: MembershipRole.SCHOOL_ADMIN }),
        ],
      });

      const { membership: created } = await ctx.useCase.handle({
        schoolId,
        token,
        userId: invitedUserId,
      });

      expect(created.role).toBe(MembershipRole.SCHOOL_MEMBER);
      expect(created.status).toBe(MembershipStatus.ACTIVE);
      expect(created.grantedBy).toBe(inviterId);
      expect(ctx.memberships()).toHaveLength(2);
    });

    it('never demotes an administrator who accepts a member invitation', async () => {
      const { invitation, token } = issue({ role: MembershipRole.SCHOOL_MEMBER });
      const ctx = setup({
        invitations: [invitation],
        memberships: [
          membership({ userId: invitedUserId, role: MembershipRole.SCHOOL_ADMIN }),
        ],
      });

      const { membership: kept } = await ctx.useCase.handle({
        schoolId,
        token,
        userId: invitedUserId,
      });

      expect(kept.role).toBe(MembershipRole.SCHOOL_ADMIN);
    });

    it('reactivates an inactive member', async () => {
      const { invitation, token } = issue({ role: MembershipRole.SCHOOL_MEMBER });
      const ctx = setup({
        invitations: [invitation],
        memberships: [
          membership({ userId: invitedUserId, status: MembershipStatus.INACTIVE }),
        ],
      });

      const { membership: back } = await ctx.useCase.handle({
        schoolId,
        token,
        userId: invitedUserId,
      });

      expect(back.status).toBe(MembershipStatus.ACTIVE);
    });

    it('cannot be used to lift a suspension', async () => {
      const { invitation, token } = issue({ role: MembershipRole.SCHOOL_MEMBER });
      const ctx = setup({
        invitations: [invitation],
        memberships: [
          membership({ userId: invitedUserId, status: MembershipStatus.SUSPENDED }),
        ],
      });

      await expect(
        ctx.useCase.handle({ schoolId, token, userId: invitedUserId }),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
      expect(ctx.memberships()[0].status).toBe(MembershipStatus.SUSPENDED);
      expect(ctx.invitations()[0].status).toBe(InvitationStatus.PENDING);
    });
  });

  it('requires a school id, a token and a user id', async () => {
    const ctx = setup({});

    await expect(
      ctx.useCase.handle({ schoolId: '', token: 'x', userId: invitedUserId }),
    ).rejects.toBeInstanceOf(InvalidSchoolException);
    await expect(
      ctx.useCase.handle({ schoolId, token: '  ', userId: invitedUserId }),
    ).rejects.toBeInstanceOf(InvalidSchoolException);
    await expect(
      ctx.useCase.handle({ schoolId, token: 'x', userId: '' }),
    ).rejects.toBeInstanceOf(InvalidSchoolException);
  });
});
