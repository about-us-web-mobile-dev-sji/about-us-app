import { describe, expect, it } from 'vitest';
import { CancelSchoolMemberSuspensionUseCase } from './cancel-school-member-suspension.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';

describe('CancelSchoolMemberSuspensionUseCase', () => {
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
    status: overrides.status ?? MembershipStatus.SUSPENDED,
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

  it('cancels the suspension when the performer is an active admin of the school', async () => {
    const admin = SchoolMembership.reconstitute(
      membershipProps({
        id: 'admin-membership',
        userId: adminUserId,
        role: MembershipRole.SCHOOL_ADMIN,
        status: MembershipStatus.ACTIVE,
      }),
    );
    const suspendedMember = SchoolMembership.reconstitute(membershipProps());

    const { repo, all } = repository([admin, suspendedMember]);
    const useCase = new CancelSchoolMemberSuspensionUseCase(repo);

    const { membership } = await useCase.handle({
      schoolId,
      memberUserId,
      performedBy: adminUserId,
    });

    expect(membership.status).toBe(MembershipStatus.ACTIVE);
    expect(all().find((m) => m.userId === memberUserId)?.status).toBe(
      MembershipStatus.ACTIVE,
    );
  });

  it('throws when the performer has no membership in the school', async () => {
    const suspendedMember = SchoolMembership.reconstitute(membershipProps());
    const { repo } = repository([suspendedMember]);
    const useCase = new CancelSchoolMemberSuspensionUseCase(repo);

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('throws when the performer is not a school admin', async () => {
    const nonAdmin = SchoolMembership.reconstitute(
      membershipProps({
        id: 'non-admin',
        userId: adminUserId,
        status: MembershipStatus.ACTIVE,
      }),
    );
    const suspendedMember = SchoolMembership.reconstitute(membershipProps());
    const { repo } = repository([nonAdmin, suspendedMember]);
    const useCase = new CancelSchoolMemberSuspensionUseCase(repo);

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('throws when the targeted member has no membership in the school', async () => {
    const admin = SchoolMembership.reconstitute(
      membershipProps({
        id: 'admin-membership',
        userId: adminUserId,
        role: MembershipRole.SCHOOL_ADMIN,
        status: MembershipStatus.ACTIVE,
      }),
    );
    const { repo } = repository([admin]);
    const useCase = new CancelSchoolMemberSuspensionUseCase(repo);

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId }),
    ).rejects.toBeInstanceOf(SchoolMembershipNotFoundException);
  });

  it('throws when the targeted member is not suspended', async () => {
    const admin = SchoolMembership.reconstitute(
      membershipProps({
        id: 'admin-membership',
        userId: adminUserId,
        role: MembershipRole.SCHOOL_ADMIN,
        status: MembershipStatus.ACTIVE,
      }),
    );
    const activeMember = SchoolMembership.reconstitute(
      membershipProps({ status: MembershipStatus.ACTIVE }),
    );
    const { repo } = repository([admin, activeMember]);
    const useCase = new CancelSchoolMemberSuspensionUseCase(repo);

    await expect(
      useCase.handle({ schoolId, memberUserId, performedBy: adminUserId }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });
});
