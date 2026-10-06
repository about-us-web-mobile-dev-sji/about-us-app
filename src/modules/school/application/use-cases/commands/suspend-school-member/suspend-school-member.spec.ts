import { describe, expect, it } from 'vitest';
import { SuspendSchoolMemberUseCase } from './suspend-school-member.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { ROLE, SCHOOL_ID, customRole, defaultRoles, membershipOf, world } from '../../../testing/school-test-helpers.js';

const ACTION = SchoolAction.SUSPEND_MEMBER;
const delegate = customRole('role-delegate', 'Délégué', [ACTION]);
const roles = () => [...defaultRoles(), delegate];
const TARGET_STATUS = MembershipStatus.ACTIVE;

const build = (members = [
  membershipOf('admin', [ROLE.admin]),
  membershipOf('member', [ROLE.student], TARGET_STATUS),
], schoolStatus = SchoolStatus.ACTIVE) => {
  const w = world(members, { roles: roles(), schoolStatus });
  return { w, useCase: new SuspendSchoolMemberUseCase(w.memberships.repo, w.authorization) };
};
const input = (performedBy: string, memberUserId = 'member') => ({ schoolId: SCHOOL_ID, memberUserId, performedBy });

describe('SuspendSchoolMemberUseCase', () => {
  it('lets the school administrator do it', async () => {
    const { w, useCase } = build();
    const { membership } = await useCase.handle(input('admin'));
    expect(membership.status).toBe(MembershipStatus.SUSPENDED);
    expect(w.memberships.get('member').status).toBe(MembershipStatus.SUSPENDED);
  });

  it('lets a member whose role carries the permission do it', async () => {
    const { useCase } = build([
      membershipOf('deleg', ['role-delegate']),
      membershipOf('member', [ROLE.student], TARGET_STATUS),
    ]);
    await expect(useCase.handle(input('deleg'))).resolves.toBeDefined();
  });

  it('refuses a member whose roles do not carry the permission', async () => {
    const { useCase } = build([
      membershipOf('staff', [ROLE.staff]),
      membershipOf('member', [ROLE.student], TARGET_STATUS),
    ]);
    await expect(useCase.handle(input('staff'))).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('refuses someone who is not a member of the school', async () => {
    const { useCase } = build();
    await expect(useCase.handle(input('ghost'))).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('refuses an administrator whose membership is suspended', async () => {
    const { useCase } = build([
      membershipOf('admin', [ROLE.admin], MembershipStatus.SUSPENDED),
      membershipOf('member', [ROLE.student], TARGET_STATUS),
    ]);
    await expect(useCase.handle(input('admin'))).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('refuses a delegate acting on the administrator', async () => {
    const { useCase } = build([
      membershipOf('admin', [ROLE.admin], TARGET_STATUS),
      membershipOf('deleg', ['role-delegate']),
    ]);
    await expect(useCase.handle(input('deleg', 'admin'))).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('refuses a delegate acting on themselves', async () => {
    const { useCase } = build([membershipOf('deleg', ['role-delegate'], MembershipStatus.ACTIVE)]);
    await expect(useCase.handle(input('deleg', 'deleg'))).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  it('refuses an administrator acting on themselves', async () => {
    const { useCase } = build([membershipOf('admin', [ROLE.admin], MembershipStatus.ACTIVE)]);
    await expect(useCase.handle(input('admin', 'admin'))).rejects.toThrow();
  });

  it('throws when the target has no membership in the school', async () => {
    const { useCase } = build([membershipOf('admin', [ROLE.admin])]);
    await expect(useCase.handle(input('admin'))).rejects.toBeInstanceOf(SchoolMembershipNotFoundException);
  });

  it('refuses a target that is in the wrong state', async () => {
    const { useCase } = build([
      membershipOf('admin', [ROLE.admin]),
      membershipOf('member', [ROLE.student], MembershipStatus.REVOKED),
    ]);
    await expect(useCase.handle(input('admin'))).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });

  it('refuses everybody when the school is BLOCKED', async () => {
    const { useCase } = build(undefined, SchoolStatus.BLOCKED);
    await expect(useCase.handle(input('admin'))).rejects.toBeInstanceOf(InvalidSchoolException);
  });
});
