import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteSchoolMemberUseCase } from './invite-school-member.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolInvitation } from '../../../../domain/entities/school-invitation.entity.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { InvitationStatus } from '../../../../domain/enums/invitation-status.enum.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolAdministratorAlreadyAssignedException } from '../../../../domain/exceptions/school-administrator-already-assigned.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import type { SchoolInvitationRepository } from '../../../../domain/repositories/i-school-invitation.repository.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';

describe('InviteSchoolMemberUseCase', () => {
  const schoolId = '11111111-1111-4111-8111-111111111111';
  const otherSchoolId = '99999999-9999-4999-8999-999999999999';
  const adminId = '22222222-2222-4222-8222-222222222222';
  const memberId = '33333333-3333-4333-8333-333333333333';
  const superAdminId = '44444444-4444-4444-8444-444444444444';

  const makeSchool = (id: string, status = SchoolStatus.ACTIVE) =>
    School.reconstitute({
      id: id as never,
      name: 'École test',
      address: null,
      phoneNumber: null,
      email: null,
      website: null,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: superAdminId,
    });

  const membership = (
    userId: string,
    role: MembershipRole,
    status = MembershipStatus.ACTIVE,
    sId = schoolId,
  ) =>
    SchoolMembership.reconstitute({
      id: `membership-${sId}-${userId}`,
      schoolId: sId,
      userId,
      role,
      status,
      grantedBy: superAdminId,
      grantedAt: new Date(),
      revokedAt: null,
      revokedBy: null,
    });

  const setup = (o: {
    memberships?: SchoolMembership[];
    invitations?: SchoolInvitation[];
    blocked?: boolean;
    accounts?: Record<string, string>; // email -> user id
  }) => {
    const schoolsById = new Map<string, School>([
      [schoolId, makeSchool(schoolId, o.blocked ? SchoolStatus.BLOCKED : SchoolStatus.ACTIVE)],
      [otherSchoolId, makeSchool(otherSchoolId)],
    ]);
    let invitations = [...(o.invitations ?? [])];
    let nextId = 1;

    const schools = {
      findById: async (id: string) => schoolsById.get(id) ?? null,
    } as unknown as SchoolRepository;

    const invitationRepo: SchoolInvitationRepository = {
      findByTokenHash: async () => null,
      findPendingBySchoolAndEmail: async (sId, email) =>
        invitations.filter(
          (i) =>
            i.schoolId === sId &&
            i.email === email &&
            i.status === InvitationStatus.PENDING,
        ),
      save: async (invitation) => {
        const saved = invitation.id
          ? invitation
          : SchoolInvitation.reconstitute({
              ...invitation.toPrimitives(),
              id: `invitation-${nextId++}`,
            });
        invitations = invitations.some((i) => i.id === saved.id)
          ? invitations.map((i) => (i.id === saved.id ? saved : i))
          : [...invitations, saved];
        return saved;
      },
    };

    const all = o.memberships ?? [];
    const membershipRepo = {
      findBySchool: async (sId: string) => all.filter((m) => m.schoolId === sId),
      findBySchoolAndUser: async (sId: string, uId: string) =>
        all.find((m) => m.schoolId === sId && m.userId === uId) ?? null,
    } as unknown as SchoolMembershipRepository;

    const accounts = o.accounts ?? {};
    const users = {
      notificationRecipientByEmail: async (email: string) =>
        accounts[email] ? { id: accounts[email], email } : null,
    } as unknown as UserAccountService;

    const emitter = { emit: vi.fn() };

    return {
      useCase: new InviteSchoolMemberUseCase(
        schools,
        invitationRepo,
        membershipRepo,
        users,
        emitter as never,
        new SchoolAuthorizationService(membershipRepo, schools),
      ),
      emitter,
      invitations: () => invitations,
    };
  };

  const base = {
    schoolId,
    email: 'New.Member@Example.com',
    performedBy: adminId,
    performedByGlobalRole: GlobalRole.USER,
  };

  const schoolAdmin = () => membership(adminId, MembershipRole.SCHOOL_ADMIN);

  beforeEach(() => vi.clearAllMocks());

  it('lets a school admin invite a member into their own school', async () => {
    const ctx = setup({ memberships: [schoolAdmin()] });

    const { invitation } = await ctx.useCase.handle(base);

    expect(invitation).toMatchObject({
      schoolId,
      email: 'new.member@example.com',
      role: MembershipRole.SCHOOL_MEMBER,
      status: InvitationStatus.PENDING,
    });
    expect(ctx.invitations()[0].invitedBy).toBe(adminId);
    expect(ctx.emitter.emit).toHaveBeenCalledTimes(1);
    const [name, event] = ctx.emitter.emit.mock.calls[0];
    expect(name).toBe('invitation.sent');
    expect(event).toMatchObject({ email: 'new.member@example.com', schoolId });
    expect(event.invitationToken).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(invitation)).not.toContain(event.invitationToken);
    expect(JSON.stringify(invitation)).not.toContain('tokenHash');
  });

  it('lets a super admin invite into any school, without being a member of it', async () => {
    const ctx = setup({});

    const { invitation } = await ctx.useCase.handle({
      ...base,
      performedBy: superAdminId,
      performedByGlobalRole: GlobalRole.SUPER_ADMIN,
    });

    expect(invitation.role).toBe(MembershipRole.SCHOOL_MEMBER);
    expect(ctx.invitations()[0].invitedBy).toBe(superAdminId);
  });

  it("refuses a school admin inviting into another school", async () => {
    const ctx = setup({ memberships: [schoolAdmin()] });

    await expect(
      ctx.useCase.handle({ ...base, schoolId: otherSchoolId }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    expect(ctx.emitter.emit).not.toHaveBeenCalled();
  });

  it('refuses plain members, suspended admins and strangers', async () => {
    for (const memberships of [
      [membership(adminId, MembershipRole.SCHOOL_MEMBER)],
      [membership(adminId, MembershipRole.SCHOOL_ADMIN, MembershipStatus.SUSPENDED)],
      [],
    ]) {
      const ctx = setup({ memberships });
      await expect(ctx.useCase.handle(base)).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
    }
  });

  it('reserves administrator invitations for the super admin', async () => {
    const asAdmin = setup({ memberships: [schoolAdmin()] });
    await expect(
      asAdmin.useCase.handle({ ...base, role: MembershipRole.SCHOOL_ADMIN }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);

    const asSuper = setup({});
    const { invitation } = await asSuper.useCase.handle({
      ...base,
      performedBy: superAdminId,
      performedByGlobalRole: GlobalRole.SUPER_ADMIN,
      role: MembershipRole.SCHOOL_ADMIN,
    });
    expect(invitation.role).toBe(MembershipRole.SCHOOL_ADMIN);
  });

  it('lets an INVITE_MEMBER delegate invite a member but never a SCHOOL_ADMIN', async () => {
    const delegate = SchoolMembership.reconstitute({
      ...membership(memberId, MembershipRole.SCHOOL_MEMBER).toPrimitives(),
      grantedPermissions: [SchoolAction.INVITE_MEMBER],
    });
    const ctx = setup({ memberships: [schoolAdmin(), delegate] });
    const asDelegate = { ...base, performedBy: memberId };

    await expect(ctx.useCase.handle({ ...asDelegate, role: MembershipRole.SCHOOL_ADMIN })).rejects.toBeInstanceOf(
      SchoolMembershipActionForbiddenException,
    );
    const { invitation } = await ctx.useCase.handle({ ...asDelegate, role: MembershipRole.SCHOOL_MEMBER });
    expect(invitation.role).toBe(MembershipRole.SCHOOL_MEMBER);
  });

  it('refuses an administrator invitation when the school already has an administrator', async () => {
    const ctx = setup({ memberships: [schoolAdmin()] });

    await expect(
      ctx.useCase.handle({
        ...base,
        performedBy: superAdminId,
        performedByGlobalRole: GlobalRole.SUPER_ADMIN,
        role: MembershipRole.SCHOOL_ADMIN,
      }),
    ).rejects.toBeInstanceOf(SchoolAdministratorAlreadyAssignedException);
  });

  it('refuses someone who is already an active member', async () => {
    const ctx = setup({
      memberships: [schoolAdmin(), membership(memberId, MembershipRole.SCHOOL_MEMBER)],
      accounts: { 'new.member@example.com': memberId },
    });

    await expect(ctx.useCase.handle(base)).rejects.toBeInstanceOf(
      InvalidSchoolMembershipException,
    );
  });

  it('refuses a suspended member (the suspension must be cancelled instead)', async () => {
    const ctx = setup({
      memberships: [
        schoolAdmin(),
        membership(memberId, MembershipRole.SCHOOL_MEMBER, MembershipStatus.SUSPENDED),
      ],
      accounts: { 'new.member@example.com': memberId },
    });

    await expect(ctx.useCase.handle(base)).rejects.toBeInstanceOf(
      InvalidSchoolMembershipException,
    );
  });

  it('never lets a revoked member back in', async () => {
    const ctx = setup({
      memberships: [
        schoolAdmin(),
        membership(memberId, MembershipRole.SCHOOL_MEMBER, MembershipStatus.REVOKED),
      ],
      accounts: { 'new.member@example.com': memberId },
    });

    await expect(ctx.useCase.handle(base)).rejects.toBeInstanceOf(
      SchoolMembershipActionForbiddenException,
    );
  });

  it('accepts a former (inactive) member', async () => {
    const ctx = setup({
      memberships: [
        schoolAdmin(),
        membership(memberId, MembershipRole.SCHOOL_MEMBER, MembershipStatus.INACTIVE),
      ],
      accounts: { 'new.member@example.com': memberId },
    });

    const { invitation } = await ctx.useCase.handle(base);
    expect(invitation.status).toBe(InvitationStatus.PENDING);
  });

  it('invites an address that has no account yet', async () => {
    const ctx = setup({ memberships: [schoolAdmin()], accounts: {} });

    await expect(ctx.useCase.handle(base)).resolves.toBeDefined();
  });

  it('cancels earlier pending invitations so that only the newest token works', async () => {
    const ctx = setup({ memberships: [schoolAdmin()] });

    await ctx.useCase.handle(base);
    await ctx.useCase.handle(base);

    const statuses = ctx.invitations().map((i) => i.status);
    expect(statuses).toEqual([InvitationStatus.CANCELLED, InvitationStatus.PENDING]);
    const tokens = ctx.emitter.emit.mock.calls.map(([, e]) => e.invitationToken);
    expect(new Set(tokens).size).toBe(2);
  });

  it('rejects an unknown or blocked school and an invalid email', async () => {
    await expect(
      setup({}).useCase.handle({
        ...base,
        schoolId: '00000000-0000-4000-8000-000000000000',
        performedBy: superAdminId,
        performedByGlobalRole: GlobalRole.SUPER_ADMIN,
      }),
    ).rejects.toBeInstanceOf(SchoolNotFoundException);

    await expect(
      setup({ blocked: true, memberships: [schoolAdmin()] }).useCase.handle(base),
    ).rejects.toBeInstanceOf(InvalidSchoolException);

    for (const email of ['', '   ', 'not-an-email', 'a@b']) {
      await expect(
        setup({ memberships: [schoolAdmin()] }).useCase.handle({ ...base, email }),
      ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
    }
  });
});
