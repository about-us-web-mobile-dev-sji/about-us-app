import { describe, expect, it } from 'vitest';
import { RevokeSchoolMemberUseCase } from './revoke-school-member.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolRole } from '../../../../domain/enums/school-role.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { SCHOOL_ID, membershipOf, world } from '../../../testing/school-test-helpers.js';

const TARGET_STATUS = MembershipStatus.ACTIVE;

const build = (members = [
  membershipOf('admin', SchoolRole.ADMIN),
  membershipOf('member', SchoolRole.MEMBER, TARGET_STATUS),
], schoolStatus = SchoolStatus.ACTIVE) => {
  const w = world(members, { schoolStatus });
  return { w, useCase: new RevokeSchoolMemberUseCase(w.memberships.repo, w.authorization) };
};
const input = (performedBy: string, memberUserId = 'member') => ({ schoolId: SCHOOL_ID, memberUserId, performedBy });

describe('RevokeSchoolMemberUseCase', () => {
  it('lets the school administrator do it', async () => {
    const { w, useCase } = build();
    const { membership } = await useCase.handle(input('admin'));
    expect(membership.status).toBe(MembershipStatus.REVOKED);
    expect(w.memberships.get('member').status).toBe(MembershipStatus.REVOKED);
  });

  it('refuses a member', async () => {
    const { useCase } = build([
      membershipOf('other', SchoolRole.MEMBER),
      membershipOf('member', SchoolRole.MEMBER, TARGET_STATUS),
    ]);
    await expect(useCase.handle(input('other'))).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('refuses someone who is not a member of the school', async () => {
    const { useCase } = build();
    await expect(useCase.handle(input('ghost'))).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('refuses an administrator whose membership is suspended', async () => {
    const { useCase } = build([
      membershipOf('admin', SchoolRole.ADMIN, MembershipStatus.SUSPENDED),
      membershipOf('member', SchoolRole.MEMBER, TARGET_STATUS),
    ]);
    await expect(useCase.handle(input('admin'))).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('refuses a member acting on the administrator', async () => {
    const { useCase } = build([
      membershipOf('admin', SchoolRole.ADMIN, TARGET_STATUS),
      membershipOf('member', SchoolRole.MEMBER),
    ]);
    await expect(useCase.handle(input('member', 'admin'))).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('refuses an administrator acting on themselves', async () => {
    const { useCase } = build([membershipOf('admin', SchoolRole.ADMIN, MembershipStatus.ACTIVE)]);
    await expect(useCase.handle(input('admin', 'admin'))).rejects.toThrow();
  });

  it('throws when the target has no membership in the school', async () => {
    const { useCase } = build([membershipOf('admin', SchoolRole.ADMIN)]);
    await expect(useCase.handle(input('admin'))).rejects.toBeInstanceOf(SchoolMembershipNotFoundException);
  });

  it('refuses a target that is in the wrong state', async () => {
    const { useCase } = build([
      membershipOf('admin', SchoolRole.ADMIN),
      membershipOf('member', SchoolRole.MEMBER, MembershipStatus.REVOKED),
    ]);
    await expect(useCase.handle(input('admin'))).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });

  it('refuses everybody when the school is BLOCKED', async () => {
    const { useCase } = build(undefined, SchoolStatus.BLOCKED);
    await expect(useCase.handle(input('admin'))).rejects.toBeInstanceOf(InvalidSchoolException);
  });
});
