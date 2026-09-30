import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolAdministratorAlreadyAssignedException } from '../../../../domain/exceptions/school-administrator-already-assigned.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { SchoolMemberRoleChangedEvent } from '../../../../infrastructure/events/school-member-role-changed.event.js';
import { ChangeSchoolMemberRoleUseCase } from './change-school-member-role.js';

describe('ChangeSchoolMemberRoleUseCase', () => {
  const schoolId = '11111111-1111-4111-8111-111111111111';
  const school = (status = SchoolStatus.ACTIVE) =>
    School.reconstitute({
      id: schoolId as never,
      name: 'École test',
      address: null,
      phoneNumber: null,
      email: null,
      website: null,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'root',
    });
  const m = (userId: string, role: MembershipRole, status = MembershipStatus.ACTIVE) =>
    SchoolMembership.reconstitute({
      id: `m-${userId}`,
      schoolId,
      userId,
      role,
      status,
      grantedBy: 'root',
      grantedAt: new Date(),
      revokedAt: null,
      revokedBy: null,
    });

  const setup = (memberships: SchoolMembership[], status = SchoolStatus.ACTIVE) => {
    let stored = [...memberships];
    const schools = { findById: async () => school(status) } as unknown as SchoolRepository;
    const repo = {
      findBySchool: async (sId: string) => stored.filter((x) => x.schoolId === sId),
      findBySchoolAndUser: async (sId: string, uId: string) =>
        stored.find((x) => x.schoolId === sId && x.userId === uId) ?? null,
      save: async (x: SchoolMembership) => {
        stored = stored.map((y) => (y.id === x.id ? x : y));
        return x;
      },
    } as unknown as SchoolMembershipRepository;
    const emitter = { emit: vi.fn() };
    return {
      useCase: new ChangeSchoolMemberRoleUseCase(
        schools,
        repo,
        new SchoolAuthorizationService(repo, schools),
        emitter as never,
      ),
      emitter,
      all: () => stored,
    };
  };

  const asAdmin = { performedBy: 'admin-1', performedByGlobalRole: GlobalRole.USER };
  const asRoot = { performedBy: 'root', performedByGlobalRole: GlobalRole.SUPER_ADMIN };
  const admin = () => m('admin-1', MembershipRole.SCHOOL_ADMIN);
  const member = (status = MembershipStatus.ACTIVE) => m('member-1', MembershipRole.SCHOOL_MEMBER, status);
  const promote = { schoolId, memberUserId: 'member-1', newRole: MembershipRole.SCHOOL_ADMIN };

  beforeEach(() => vi.clearAllMocks());

  it('lets a super admin promote a member to admin, saves and emits the event', async () => {
    const ctx = setup([member()]);
    const { membership, previousRole } = await ctx.useCase.handle({ ...promote, ...asRoot });

    expect(membership.role).toBe(MembershipRole.SCHOOL_ADMIN);
    expect(previousRole).toBe(MembershipRole.SCHOOL_MEMBER);
    expect(ctx.all()[0].role).toBe(MembershipRole.SCHOOL_ADMIN);
    expect(ctx.emitter.emit).toHaveBeenCalledWith(
      'school.member-role.changed',
      expect.any(SchoolMemberRoleChangedEvent),
    );
    expect(ctx.emitter.emit.mock.calls[0][1]).toMatchObject({
      schoolId,
      schoolName: 'École test',
      memberUserId: 'member-1',
      previousRole: MembershipRole.SCHOOL_MEMBER,
      newRole: MembershipRole.SCHOOL_ADMIN,
      changedBy: 'root',
      recipientIds: ['member-1'],
    });
  });

  it('lets a super admin demote the administrator to member', async () => {
    const ctx = setup([m('admin-1', MembershipRole.SCHOOL_ADMIN)]);
    const { membership } = await ctx.useCase.handle({
      schoolId,
      memberUserId: 'admin-1',
      newRole: MembershipRole.SCHOOL_MEMBER,
      ...asRoot,
    });
    expect(membership.role).toBe(MembershipRole.SCHOOL_MEMBER);
  });

  it('refuses a school admin promoting someone to admin', async () => {
    const ctx = setup([admin(), member()]);
    await expect(ctx.useCase.handle({ ...promote, ...asAdmin })).rejects.toBeInstanceOf(
      SchoolMembershipActionForbiddenException,
    );
    expect(ctx.emitter.emit).not.toHaveBeenCalled();
  });

  it('refuses when another live admin already exists', async () => {
    const ctx = setup([m('admin-1', MembershipRole.SCHOOL_ADMIN, MembershipStatus.SUSPENDED), member()]);
    await expect(ctx.useCase.handle({ ...promote, ...asRoot })).rejects.toBeInstanceOf(
      SchoolAdministratorAlreadyAssignedException,
    );
  });

  it('refuses an admin changing their own role (demotion or not)', async () => {
    const ctx = setup([admin()]);
    await expect(
      ctx.useCase.handle({ schoolId, memberUserId: 'admin-1', newRole: MembershipRole.SCHOOL_MEMBER, ...asAdmin }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
    await expect(
      ctx.useCase.handle({ schoolId, memberUserId: 'admin-1', newRole: MembershipRole.SCHOOL_ADMIN, ...asAdmin }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });

  it('refuses a school admin touching the administrator role of someone else', async () => {
    const ctx = setup([admin(), m('admin-2', MembershipRole.SCHOOL_ADMIN)]);
    await expect(
      ctx.useCase.handle({ schoolId, memberUserId: 'admin-2', newRole: MembershipRole.SCHOOL_MEMBER, ...asAdmin }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('refuses a simple member, a suspended admin and a non-member', async () => {
    const forbidden = SchoolMembershipActionForbiddenException;
    const demote = { schoolId, memberUserId: 'member-1', newRole: MembershipRole.SCHOOL_MEMBER };
    await expect(
      setup([member(), m('member-2', MembershipRole.SCHOOL_MEMBER)]).useCase.handle({
        ...demote,
        performedBy: 'member-2',
        performedByGlobalRole: GlobalRole.USER,
      }),
    ).rejects.toBeInstanceOf(forbidden);
    await expect(
      setup([m('admin-1', MembershipRole.SCHOOL_ADMIN, MembershipStatus.SUSPENDED), member()]).useCase.handle({
        ...demote,
        ...asAdmin,
      }),
    ).rejects.toBeInstanceOf(forbidden);
    await expect(setup([member()]).useCase.handle({ ...demote, ...asAdmin })).rejects.toBeInstanceOf(forbidden);
  });

  it('refuses when the target has no membership', async () => {
    await expect(
      setup([admin()]).useCase.handle({
        schoolId,
        memberUserId: 'ghost',
        newRole: MembershipRole.SCHOOL_MEMBER,
        ...asAdmin,
      }),
    ).rejects.toBeInstanceOf(SchoolMembershipNotFoundException);
  });

  it('refuses a REVOKED membership and an identical role', async () => {
    await expect(
      setup([member(MembershipStatus.REVOKED)]).useCase.handle({ ...promote, ...asRoot }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
    await expect(
      setup([member()]).useCase.handle({ ...promote, newRole: MembershipRole.SCHOOL_MEMBER, ...asRoot }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });

  it('refuses a school admin when the school is BLOCKED, but not a super admin', async () => {
    const blocked = setup([admin(), m('admin-2', MembershipRole.SCHOOL_MEMBER)], SchoolStatus.BLOCKED);
    await expect(
      blocked.useCase.handle({
        schoolId,
        memberUserId: 'admin-2',
        newRole: MembershipRole.SCHOOL_MEMBER,
        ...asAdmin,
      }),
    ).rejects.toBeInstanceOf(InvalidSchoolException);
    await expect(
      setup([member()], SchoolStatus.BLOCKED).useCase.handle({ ...promote, ...asRoot }),
    ).resolves.toBeDefined();
  });
});
