import { describe, expect, it } from 'vitest';
import { SchoolMembership } from './school-membership.entity.js';
import { MembershipStatus } from '../enums/membership-status.enum.js';
import { InvalidSchoolMembershipException } from '../exceptions/invalid-school-membership.exception.js';

const make = (roleIds: string[], status = MembershipStatus.ACTIVE) =>
  SchoolMembership.reconstitute({
    id: 'm-1',
    schoolId: 's-1',
    userId: 'u-1',
    roleIds,
    status,
    grantedBy: 'root',
    grantedAt: new Date(),
    revokedAt: null,
    revokedBy: null,
  });

describe('SchoolMembership.create', () => {
  it('requires at least one role and removes duplicates', () => {
    expect(() =>
      SchoolMembership.create({ schoolId: 's', userId: 'u', roleIds: [], grantedBy: 'g' }),
    ).toThrow(InvalidSchoolMembershipException);
    const m = SchoolMembership.create({
      schoolId: 's',
      userId: 'u',
      roleIds: ['r1', 'r1', 'r2'],
      grantedBy: 'g',
    });
    expect(m.roleIds).toEqual(['r1', 'r2']);
  });
});

describe('SchoolMembership roles', () => {
  it('assigns a role, idempotently', () => {
    const m = make(['r1']);
    expect(m.assignRole('r2')).toBe(true);
    expect(m.assignRole('r2')).toBe(false);
    expect(m.roleIds).toEqual(['r1', 'r2']);
  });

  it('removes a role, idempotently', () => {
    const m = make(['r1', 'r2']);
    expect(m.removeRole('r2')).toBe(true);
    expect(m.removeRole('r2')).toBe(false);
    expect(m.roleIds).toEqual(['r1']);
  });

  it('never removes the last role', () => {
    expect(() => make(['r1']).removeRole('r1')).toThrow(InvalidSchoolMembershipException);
  });

  it('refuses any role change on a revoked membership', () => {
    const m = make(['r1'], MembershipStatus.REVOKED);
    expect(() => m.assignRole('r2')).toThrow(InvalidSchoolMembershipException);
    expect(() => m.removeRole('r1')).toThrow(InvalidSchoolMembershipException);
  });
});

describe('SchoolMembership status', () => {
  it('suspends then restores', () => {
    const m = make(['r1']);
    m.suspend();
    expect(m.status).toBe(MembershipStatus.SUSPENDED);
    m.cancelSuspension();
    expect(m.status).toBe(MembershipStatus.ACTIVE);
  });

  it('refuses to suspend a revoked membership', () => {
    expect(() => make(['r1'], MembershipStatus.REVOKED).suspend()).toThrow(
      InvalidSchoolMembershipException,
    );
  });
});
