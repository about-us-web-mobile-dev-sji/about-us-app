import { describe, expect, it } from 'vitest';
import { SchoolMembership } from './school-membership.entity.js';
import { MembershipRole } from '../enums/membership-role.enum.js';
import { MembershipStatus } from '../enums/membership-status.enum.js';
import { SchoolAction } from '../enums/school-action.enum.js';
import { InvalidSchoolMembershipException } from '../exceptions/invalid-school-membership.exception.js';

describe('SchoolMembership.changeRole', () => {
  const make = (role: MembershipRole, status = MembershipStatus.ACTIVE) =>
    SchoolMembership.reconstitute({
      id: 'm-1',
      schoolId: 's-1',
      userId: 'u-1',
      role,
      status,
      grantedBy: 'root',
      grantedAt: new Date(),
      revokedAt: null,
      revokedBy: null,
    });

  it('changes the role', () => {
    const m = make(MembershipRole.SCHOOL_MEMBER);
    m.changeRole(MembershipRole.SCHOOL_ADMIN);
    expect(m.role).toBe(MembershipRole.SCHOOL_ADMIN);
  });

  it('refuses an identical role', () => {
    expect(() => make(MembershipRole.SCHOOL_MEMBER).changeRole(MembershipRole.SCHOOL_MEMBER)).toThrow(
      InvalidSchoolMembershipException,
    );
  });

  it('refuses a revoked membership', () => {
    expect(() =>
      make(MembershipRole.SCHOOL_MEMBER, MembershipStatus.REVOKED).changeRole(MembershipRole.SCHOOL_ADMIN),
    ).toThrow(InvalidSchoolMembershipException);
  });
});

describe('SchoolMembership delegated permissions', () => {
  const make = (
    role = MembershipRole.SCHOOL_MEMBER,
    status = MembershipStatus.ACTIVE,
    grantedPermissions: SchoolAction[] = [],
  ) =>
    SchoolMembership.reconstitute({
      id: 'm-1',
      schoolId: 's-1',
      userId: 'u-1',
      role,
      status,
      grantedBy: 'root',
      grantedAt: new Date(),
      revokedAt: null,
      revokedBy: null,
      grantedPermissions,
    });

  it('starts empty on create and exposes the list through toPrimitives', () => {
    const created = SchoolMembership.create({
      schoolId: 's-1',
      userId: 'u-1',
      role: MembershipRole.SCHOOL_MEMBER,
      grantedBy: 'root',
    });
    expect(created.grantedPermissions).toEqual([]);
    expect(created.toPrimitives().grantedPermissions).toEqual([]);
  });

  it('defaults to [] when reconstituting a legacy row without the field', () => {
    const legacy = SchoolMembership.reconstitute({
      id: 'm-1',
      schoolId: 's-1',
      userId: 'u-1',
      role: MembershipRole.SCHOOL_MEMBER,
      status: MembershipStatus.ACTIVE,
      grantedBy: 'root',
      grantedAt: new Date(),
      revokedAt: null,
      revokedBy: null,
    });
    expect(legacy.grantedPermissions).toEqual([]);
  });

  it('grants then revokes a delegable action, without duplicates', () => {
    const m = make();
    expect(m.grantPermission(SchoolAction.SUSPEND_MEMBER)).toBe(true);
    expect(m.grantPermission(SchoolAction.SUSPEND_MEMBER)).toBe(false);
    expect(m.toPrimitives().grantedPermissions).toEqual([SchoolAction.SUSPEND_MEMBER]);
    expect(m.revokePermission(SchoolAction.SUSPEND_MEMBER)).toBe(true);
    expect(m.revokePermission(SchoolAction.SUSPEND_MEMBER)).toBe(false);
    expect(m.grantedPermissions).toEqual([]);
  });

  it.each([
    SchoolAction.MANAGE_MEMBER_PERMISSIONS,
    SchoolAction.CHANGE_MEMBER_ROLE,
    SchoolAction.INVITE_ADMIN,
    'BLOCK_SCHOOL' as SchoolAction,
  ])('refuses the non delegable action %s (grant and revoke)', (action) => {
    expect(() => make().grantPermission(action)).toThrow(InvalidSchoolMembershipException);
    expect(() => make().revokePermission(action)).toThrow(InvalidSchoolMembershipException);
  });

  it.each([MembershipStatus.SUSPENDED, MembershipStatus.INACTIVE, MembershipStatus.REVOKED])(
    'refuses a %s membership',
    (status) => {
      expect(() => make(MembershipRole.SCHOOL_MEMBER, status).grantPermission(SchoolAction.VIEW_MEMBERS)).toThrow(
        InvalidSchoolMembershipException,
      );
    },
  );

  it('refuses a school administrator', () => {
    expect(() => make(MembershipRole.SCHOOL_ADMIN).grantPermission(SchoolAction.VIEW_MEMBERS)).toThrow(
      InvalidSchoolMembershipException,
    );
  });

  it('clears the delegated permissions when the role changes', () => {
    const m = make(MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, [SchoolAction.INVITE_MEMBER]);
    m.changeRole(MembershipRole.SCHOOL_ADMIN);
    expect(m.grantedPermissions).toEqual([]);
  });

  it('does not let callers mutate the internal list', () => {
    const m = make(MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, [SchoolAction.VIEW_MEMBERS]);
    (m.toPrimitives().grantedPermissions as SchoolAction[]).push(SchoolAction.REVOKE_MEMBER);
    expect(m.grantedPermissions).toEqual([SchoolAction.VIEW_MEMBERS]);
  });
});
