import { describe, expect, it } from 'vitest';
import { SchoolMembership } from './school-membership.entity.js';
import { MembershipStatus } from '../enums/membership-status.enum.js';
import { SchoolRole } from '../enums/school-role.enum.js';
import { InvalidSchoolMembershipException } from '../exceptions/invalid-school-membership.exception.js';

const make = (role = SchoolRole.MEMBER, status = MembershipStatus.ACTIVE) =>
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

describe('SchoolMembership.create', () => {
  it('makes a member by default', () => {
    const m = SchoolMembership.create({ schoolId: 's', userId: 'u', grantedBy: 'g' });
    expect(m.role).toBe(SchoolRole.MEMBER);
    expect(m.isAdmin).toBe(false);
    expect(m.status).toBe(MembershipStatus.ACTIVE);
  });

  it('can make an administrator', () => {
    const m = SchoolMembership.create({ schoolId: 's', userId: 'u', role: SchoolRole.ADMIN, grantedBy: 'g' });
    expect(m.isAdmin).toBe(true);
  });

  it('refuses an unknown role', () => {
    expect(() =>
      SchoolMembership.create({ schoolId: 's', userId: 'u', role: 'TEACHER' as SchoolRole, grantedBy: 'g' }),
    ).toThrow(InvalidSchoolMembershipException);
  });
});

describe('SchoolMembership role', () => {
  it('changes the role, idempotently', () => {
    const m = make();
    expect(m.changeRole(SchoolRole.ADMIN)).toBe(true);
    expect(m.changeRole(SchoolRole.ADMIN)).toBe(false);
    expect(m.role).toBe(SchoolRole.ADMIN);
  });

  it('refuses any role change on a revoked membership', () => {
    expect(() => make(SchoolRole.MEMBER, MembershipStatus.REVOKED).changeRole(SchoolRole.ADMIN)).toThrow(
      InvalidSchoolMembershipException,
    );
  });
});

describe('SchoolMembership status', () => {
  it('suspends then restores', () => {
    const m = make();
    m.suspend();
    expect(m.status).toBe(MembershipStatus.SUSPENDED);
    m.cancelSuspension();
    expect(m.status).toBe(MembershipStatus.ACTIVE);
  });

  it('refuses to suspend a revoked membership', () => {
    expect(() => make(SchoolRole.MEMBER, MembershipStatus.REVOKED).suspend()).toThrow(
      InvalidSchoolMembershipException,
    );
  });
});
