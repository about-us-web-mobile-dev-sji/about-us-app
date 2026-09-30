import { describe, expect, it } from 'vitest';
import { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';
import { ListSchoolMembersUseCase } from './list-school-members.js';

describe('ListSchoolMembersUseCase', () => {
  const schoolId = '11111111-1111-4111-8111-111111111111';
  const school = School.reconstitute({
    id: schoolId as never,
    name: 'École test',
    address: null,
    phoneNumber: null,
    email: null,
    website: null,
    status: SchoolStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'root',
  });
  const m = (
    userId: string,
    role: MembershipRole,
    status = MembershipStatus.ACTIVE,
    day = 1,
    grantedPermissions: SchoolAction[] = [],
  ) =>
    SchoolMembership.reconstitute({
      id: `m-${userId}`,
      schoolId,
      userId,
      role,
      status,
      grantedBy: 'root',
      grantedAt: new Date(2026, 0, day),
      revokedAt: null,
      revokedBy: null,
      grantedPermissions,
    });

  const users = {
    authenticationProfile: async (id: string) => ({
      id,
      email: `${id}@school.test`,
      globalRole: GlobalRole.USER,
      firstName: `First-${id}`,
      lastName: `Last-${id}`,
    }),
  } as unknown as UserAccountService;

  const setup = (memberships: SchoolMembership[], knownSchool: School | null = school) => {
    const schools = { findById: async () => knownSchool } as unknown as SchoolRepository;
    const repo = {
      findBySchool: async (sId: string) => memberships.filter((x) => x.schoolId === sId),
      findBySchoolAndUser: async (sId: string, uId: string) =>
        memberships.find((x) => x.schoolId === sId && x.userId === uId) ?? null,
    } as unknown as SchoolMembershipRepository;
    return new ListSchoolMembersUseCase(schools, repo, new SchoolAuthorizationService(repo, schools), users);
  };

  const roster = () => [
    m('member-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, 3),
    m('admin-1', MembershipRole.SCHOOL_ADMIN, MembershipStatus.ACTIVE, 2),
    m('suspended-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.SUSPENDED, 4),
    m('revoked-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.REVOKED, 5),
  ];

  it('lists the administrator AND the members (admin first, REVOKED hidden) for an admin', async () => {
    const { members } = await setup(roster()).handle({
      schoolId,
      performedBy: 'admin-1',
      performedByGlobalRole: GlobalRole.USER,
    });
    expect(members.map((x) => x.userId)).toEqual(['admin-1', 'member-1', 'suspended-1']);
    expect(members[0]).toMatchObject({ role: MembershipRole.SCHOOL_ADMIN, status: MembershipStatus.ACTIVE });
    expect(members[1]).toMatchObject({ role: MembershipRole.SCHOOL_MEMBER });
  });

  it('gives the FULL view (email, status, names) to an admin', async () => {
    const out = await setup(roster()).handle({
      schoolId,
      performedBy: 'admin-1',
      performedByGlobalRole: GlobalRole.USER,
    });
    expect(out.view).toBe('full');
    expect(out.members[0]).toMatchObject({
      email: 'admin-1@school.test',
      firstName: 'First-admin-1',
      status: MembershipStatus.ACTIVE,
    });
  });

  it('gives the REDUCED view (name, role, ACTIVE only, no email, no status) to a VIEW_MEMBERS delegate', async () => {
    const withDelegate = [...roster(), m('delegate-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, 6, [SchoolAction.VIEW_MEMBERS])];
    const out = await setup(withDelegate).handle({
      schoolId,
      performedBy: 'delegate-1',
      performedByGlobalRole: GlobalRole.USER,
      status: MembershipStatus.SUSPENDED, // ignored in the reduced view
    });
    expect(out.view).toBe('reduced');
    expect(out.members.map((x) => x.userId)).toEqual(['admin-1', 'member-1', 'delegate-1']);
    for (const member of out.members) {
      expect(Object.keys(member).sort()).toEqual(['firstName', 'lastName', 'role', 'userId']);
    }
    expect(out.members[0]).toEqual({
      userId: 'admin-1',
      firstName: 'First-admin-1',
      lastName: 'Last-admin-1',
      role: MembershipRole.SCHOOL_ADMIN,
    });
  });

  it('gives the FULL view to a VIEW_MEMBER_DETAILS delegate', async () => {
    const withDelegate = [...roster(), m('delegate-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, 6, [SchoolAction.VIEW_MEMBER_DETAILS])];
    const out = await setup(withDelegate).handle({
      schoolId,
      performedBy: 'delegate-1',
      performedByGlobalRole: GlobalRole.USER,
    });
    expect(out.view).toBe('full');
    expect(out.members[0]).toHaveProperty('email');
  });

  it('answers 403 to a plain member without permission and to a suspended delegate', async () => {
    const forbidden = SchoolMembershipActionForbiddenException;
    await expect(
      setup(roster()).handle({ schoolId, performedBy: 'member-1', performedByGlobalRole: GlobalRole.USER }),
    ).rejects.toBeInstanceOf(forbidden);
    await expect(
      setup([m('delegate-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.SUSPENDED, 1, [SchoolAction.VIEW_MEMBERS])]).handle({
        schoolId,
        performedBy: 'delegate-1',
        performedByGlobalRole: GlobalRole.USER,
      }),
    ).rejects.toBeInstanceOf(forbidden);
  });

  it('lets a super admin without membership view the list, and is absent from it', async () => {
    const { members } = await setup(roster()).handle({
      schoolId,
      performedBy: 'root',
      performedByGlobalRole: GlobalRole.SUPER_ADMIN,
    });
    expect(members.map((x) => x.userId)).toEqual(['admin-1', 'member-1', 'suspended-1']);
  });

  it('includes a super admin who does hold a membership', async () => {
    const { members } = await setup([...roster(), m('root', MembershipRole.SCHOOL_MEMBER)]).handle({
      schoolId,
      performedBy: 'root',
      performedByGlobalRole: GlobalRole.SUPER_ADMIN,
    });
    expect(members.map((x) => x.userId)).toContain('root');
  });

  it('filters by status, and can show REVOKED explicitly', async () => {
    const useCase = setup(roster());
    const base = { schoolId, performedBy: 'admin-1', performedByGlobalRole: GlobalRole.USER };
    expect((await useCase.handle({ ...base, status: MembershipStatus.REVOKED })).members.map((x) => x.userId)).toEqual([
      'revoked-1',
    ]);
    expect((await useCase.handle({ ...base, status: MembershipStatus.SUSPENDED })).members.map((x) => x.userId)).toEqual([
      'suspended-1',
    ]);
  });

  it('refuses a non-member and a suspended admin', async () => {
    const forbidden = SchoolMembershipActionForbiddenException;
    await expect(
      setup(roster()).handle({ schoolId, performedBy: 'stranger', performedByGlobalRole: GlobalRole.USER }),
    ).rejects.toBeInstanceOf(forbidden);
    await expect(
      setup([m('admin-1', MembershipRole.SCHOOL_ADMIN, MembershipStatus.SUSPENDED)]).handle({
        schoolId,
        performedBy: 'admin-1',
        performedByGlobalRole: GlobalRole.USER,
      }),
    ).rejects.toBeInstanceOf(forbidden);
  });

  it('throws when the school does not exist', async () => {
    await expect(
      setup([], null).handle({ schoolId, performedBy: 'root', performedByGlobalRole: GlobalRole.SUPER_ADMIN }),
    ).rejects.toBeInstanceOf(SchoolNotFoundException);
  });
});
