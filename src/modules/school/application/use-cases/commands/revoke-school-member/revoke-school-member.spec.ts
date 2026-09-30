import { describe, expect, it } from 'vitest';
import { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import { RevokeSchoolMemberUseCase } from './revoke-school-member.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';

describe('RevokeSchoolMemberUseCase', () => {
  const schoolId = '11111111-1111-4111-8111-111111111111';
  const adminUserId = 'admin-1';
  const memberUserId = 'member-1';

  const membershipProps = (overrides: Partial<{
    id: string;
    userId: string;
    role: MembershipRole;
    status: MembershipStatus;
  }> = {}) => ({
    id: overrides.id ?? 'membership-1',
    schoolId,
    userId: overrides.userId ?? memberUserId,
    role: overrides.role ?? MembershipRole.SCHOOL_MEMBER,
    status: overrides.status ?? MembershipStatus.ACTIVE,
    grantedBy: adminUserId,
    grantedAt: new Date(),
    revokedAt: null,
    revokedBy: null,
  });


  const schoolsRepo = {
    findById: async () => ({ status: SchoolStatus.ACTIVE }),
  } as unknown as SchoolRepository;
  const repository = (
    initial: SchoolMembership[],
  ): { repo: SchoolMembershipRepository; all: () => SchoolMembership[] } => {
    let stored = [...initial];
    return {
      repo: {
        findById: async (id) => stored.find((m) => m.id === id) ?? null,
        findBySchoolAndUser: async (sId, userId) =>
          stored.find((m) => m.schoolId === sId && m.userId === userId) ??
          null,
        findActiveAdminBySchool: async () => null,
        findActiveByUser: async (userId) =>
          stored.filter(
            (m) => m.userId === userId && m.status === MembershipStatus.ACTIVE,
          ),
        findBySchool: async (sId) =>
          stored.filter((m) => m.schoolId === sId),
        save: async (membership) => {
          stored = stored.map((m) => (m.id === membership.id ? membership : m));
          return membership;
        },
      },
      all: () => stored,
    };
  };

  const activeAdmin = () =>
    SchoolMembership.reconstitute(
      membershipProps({
        id: 'admin-membership',
        userId: adminUserId,
        role: MembershipRole.SCHOOL_ADMIN,
      }),
    );

  it('revokes a member when the performer is an active admin of the school', async () => {
    const admin = activeAdmin();
    const member = SchoolMembership.reconstitute(membershipProps());

    const { repo, all } = repository([admin, member]);
    const useCase = new RevokeSchoolMemberUseCase(repo, new SchoolAuthorizationService(repo, schoolsRepo));

    const { membership } = await useCase.handle({
      schoolId,
      memberUserId,
      performedBy: adminUserId,
      performedByGlobalRole: GlobalRole.USER,
    });

    expect(membership.status).toBe(MembershipStatus.REVOKED);
    expect(membership.revokedBy).toBe(adminUserId);
    expect(membership.revokedAt).toBeInstanceOf(Date);
    expect(all().find((m) => m.userId === memberUserId)?.status).toBe(
      MembershipStatus.REVOKED,
    );
  });

  it('revokes a suspended member as well', async () => {
    const admin = activeAdmin();
    const suspendedMember = SchoolMembership.reconstitute(
      membershipProps({ status: MembershipStatus.SUSPENDED }),
    );

    const { repo } = repository([admin, suspendedMember]);
    const useCase = new RevokeSchoolMemberUseCase(repo, new SchoolAuthorizationService(repo, schoolsRepo));

    const { membership } = await useCase.handle({
      schoolId,
      memberUserId,
      performedBy: adminUserId,
      performedByGlobalRole: GlobalRole.USER,
    });

    expect(membership.status).toBe(MembershipStatus.REVOKED);
  });

  it('throws when the performer has no membership in the school', async () => {
    const member = SchoolMembership.reconstitute(membershipProps());
    const { repo } = repository([member]);
    const useCase = new RevokeSchoolMemberUseCase(repo, new SchoolAuthorizationService(repo, schoolsRepo));

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId, performedByGlobalRole: GlobalRole.USER }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('revokes a member when the performer is a global super admin with no membership in the school', async () => {
    const superAdminId = 'super-admin-1';
    const member = SchoolMembership.reconstitute(membershipProps());
    const { repo, all } = repository([member]);
    const useCase = new RevokeSchoolMemberUseCase(repo, new SchoolAuthorizationService(repo, schoolsRepo));

    const { membership } = await useCase.handle({
      schoolId,
      memberUserId,
      performedBy: superAdminId,
      performedByGlobalRole: GlobalRole.SUPER_ADMIN,
    });

    expect(membership.status).toBe(MembershipStatus.REVOKED);
    expect(membership.revokedBy).toBe(superAdminId);
    expect(all().find((m) => m.userId === memberUserId)?.status).toBe(
      MembershipStatus.REVOKED,
    );
  });

  it('throws when the performer is not a school admin', async () => {
    const nonAdmin = SchoolMembership.reconstitute(
      membershipProps({ id: 'non-admin', userId: adminUserId }),
    );
    const member = SchoolMembership.reconstitute(membershipProps());
    const { repo } = repository([nonAdmin, member]);
    const useCase = new RevokeSchoolMemberUseCase(repo, new SchoolAuthorizationService(repo, schoolsRepo));

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId, performedByGlobalRole: GlobalRole.USER }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('throws when an administrator tries to revoke themselves', async () => {
    const admin = activeAdmin();
    const { repo } = repository([admin]);
    const useCase = new RevokeSchoolMemberUseCase(repo, new SchoolAuthorizationService(repo, schoolsRepo));

    await expect(
      useCase.handle({
        schoolId,
        memberUserId: adminUserId,
        performedBy: adminUserId,
      performedByGlobalRole: GlobalRole.USER,
      }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });

  it('throws when the targeted member has no membership in the school', async () => {
    const admin = activeAdmin();
    const { repo } = repository([admin]);
    const useCase = new RevokeSchoolMemberUseCase(repo, new SchoolAuthorizationService(repo, schoolsRepo));

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId, performedByGlobalRole: GlobalRole.USER }),
    ).rejects.toBeInstanceOf(SchoolMembershipNotFoundException);
  });

  it('throws when trying to revoke the school administrator membership', async () => {
    const admin = activeAdmin();
    const otherAdmin = SchoolMembership.reconstitute(
      membershipProps({
        id: 'other-admin-membership',
        userId: memberUserId,
        role: MembershipRole.SCHOOL_ADMIN,
      }),
    );
    const { repo } = repository([admin, otherAdmin]);
    const useCase = new RevokeSchoolMemberUseCase(repo, new SchoolAuthorizationService(repo, schoolsRepo));

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId, performedByGlobalRole: GlobalRole.USER }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('throws when the targeted member is already revoked', async () => {
    const admin = activeAdmin();
    const alreadyRevoked = SchoolMembership.reconstitute(
      membershipProps({ status: MembershipStatus.REVOKED }),
    );
    const { repo } = repository([admin, alreadyRevoked]);
    const useCase = new RevokeSchoolMemberUseCase(repo, new SchoolAuthorizationService(repo, schoolsRepo));

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId, performedByGlobalRole: GlobalRole.USER }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });

  describe('when the school is BLOCKED', () => {
    const blockedSchools = {
      findById: async () => ({ status: SchoolStatus.BLOCKED }),
    } as unknown as SchoolRepository;

    const build = () => {
      const admin = SchoolMembership.reconstitute(
        membershipProps({ id: 'admin-membership', userId: adminUserId, role: MembershipRole.SCHOOL_ADMIN }),
      );
      const member = SchoolMembership.reconstitute(membershipProps());
      const { repo } = repository([admin, member]);
      return new RevokeSchoolMemberUseCase(repo, new SchoolAuthorizationService(repo, blockedSchools));
    };

    it('refuses a school admin', async () => {
      await expect(
        build().handle({ schoolId, memberUserId, performedBy: adminUserId, performedByGlobalRole: GlobalRole.USER }),
      ).rejects.toBeInstanceOf(InvalidSchoolException);
    });

    it('still lets a super admin act', async () => {
      await expect(
        build().handle({ schoolId, memberUserId, performedBy: 'root', performedByGlobalRole: GlobalRole.SUPER_ADMIN }),
      ).resolves.toBeDefined();
    });
  });
});
