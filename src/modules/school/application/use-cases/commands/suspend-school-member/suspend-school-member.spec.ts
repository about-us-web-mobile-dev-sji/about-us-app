import { describe, expect, it } from 'vitest';
import { SuspendSchoolMemberUseCase } from './suspend-school-member.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';

describe('SuspendSchoolMemberUseCase', () => {
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

  it('suspends a member when the performer is an active admin of the school', async () => {
    const admin = SchoolMembership.reconstitute(
      membershipProps({
        id: 'admin-membership',
        userId: adminUserId,
        role: MembershipRole.SCHOOL_ADMIN,
      }),
    );
    const member = SchoolMembership.reconstitute(membershipProps());

    const { repo, all } = repository([admin, member]);
    const useCase = new SuspendSchoolMemberUseCase(repo);

    const { membership } = await useCase.handle({
      schoolId,
      memberUserId,
      performedBy: adminUserId,
    });

    expect(membership.status).toBe(MembershipStatus.SUSPENDED);
    expect(all().find((m) => m.userId === memberUserId)?.status).toBe(
      MembershipStatus.SUSPENDED,
    );
  });

  it('throws when the performer has no membership in the school', async () => {
    const member = SchoolMembership.reconstitute(membershipProps());
    const { repo } = repository([member]);
    const useCase = new SuspendSchoolMemberUseCase(repo);

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('throws when the performer is not a school admin', async () => {
    const nonAdmin = SchoolMembership.reconstitute(
      membershipProps({ id: 'non-admin', userId: adminUserId }),
    );
    const member = SchoolMembership.reconstitute(membershipProps());
    const { repo } = repository([nonAdmin, member]);
    const useCase = new SuspendSchoolMemberUseCase(repo);

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('throws when the performer admin membership is not active', async () => {
    const suspendedAdmin = SchoolMembership.reconstitute(
      membershipProps({
        id: 'admin-membership',
        userId: adminUserId,
        role: MembershipRole.SCHOOL_ADMIN,
        status: MembershipStatus.SUSPENDED,
      }),
    );
    const member = SchoolMembership.reconstitute(membershipProps());
    const { repo } = repository([suspendedAdmin, member]);
    const useCase = new SuspendSchoolMemberUseCase(repo);

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('throws when an administrator tries to suspend themselves', async () => {
    const admin = SchoolMembership.reconstitute(
      membershipProps({
        id: 'admin-membership',
        userId: adminUserId,
        role: MembershipRole.SCHOOL_ADMIN,
      }),
    );
    const { repo } = repository([admin]);
    const useCase = new SuspendSchoolMemberUseCase(repo);

    await expect(
      useCase.handle({ schoolId, memberUserId: adminUserId, performedBy: adminUserId }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });

  it('throws when the targeted member has no membership in the school', async () => {
    const admin = SchoolMembership.reconstitute(
      membershipProps({
        id: 'admin-membership',
        userId: adminUserId,
        role: MembershipRole.SCHOOL_ADMIN,
      }),
    );
    const { repo } = repository([admin]);
    const useCase = new SuspendSchoolMemberUseCase(repo);

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId }),
    ).rejects.toBeInstanceOf(SchoolMembershipNotFoundException);
  });

  it('throws when the targeted member is already suspended', async () => {
    const admin = SchoolMembership.reconstitute(
      membershipProps({
        id: 'admin-membership',
        userId: adminUserId,
        role: MembershipRole.SCHOOL_ADMIN,
      }),
    );
    const alreadySuspended = SchoolMembership.reconstitute(
      membershipProps({ status: MembershipStatus.SUSPENDED }),
    );
    const { repo } = repository([admin, alreadySuspended]);
    const useCase = new SuspendSchoolMemberUseCase(repo);

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });

  it('throws when the targeted member is revoked', async () => {
    const admin = SchoolMembership.reconstitute(
      membershipProps({
        id: 'admin-membership',
        userId: adminUserId,
        role: MembershipRole.SCHOOL_ADMIN,
      }),
    );
    const revoked = SchoolMembership.reconstitute(
      membershipProps({ status: MembershipStatus.REVOKED }),
    );
    const { repo } = repository([admin, revoked]);
    const useCase = new SuspendSchoolMemberUseCase(repo);

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });
});
