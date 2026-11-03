import { describe, expect, it } from 'vitest';
import { SCHOOL_ID, membershipOf, world } from '../testing/school-test-helpers.js';
import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { SchoolRole } from '../../domain/enums/school-role.enum.js';
import { SchoolStatus } from '../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../domain/exceptions/invalid-school.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolNotFoundException } from '../../domain/exceptions/school-not-found.exception.js';
import { SchoolAuthorizationService } from './school-authorization.service.js';

describe('SchoolAuthorizationService', () => {
  describe('assertSchoolAdmin', () => {
    it('lets the active administrator through', async () => {
      const { authorization } = world([membershipOf('admin', SchoolRole.ADMIN)]);
      await expect(authorization.assertSchoolAdmin({ userId: 'admin' }, SCHOOL_ID)).resolves.toBeUndefined();
    });

    it('refuses a member', async () => {
      const { authorization } = world([membershipOf('member', SchoolRole.MEMBER)]);
      await expect(authorization.assertSchoolAdmin({ userId: 'member' }, SCHOOL_ID)).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
    });

    it.each([MembershipStatus.SUSPENDED, MembershipStatus.INACTIVE, MembershipStatus.REVOKED])(
      'refuses an administrator whose membership is %s',
      async (status) => {
        const { authorization } = world([membershipOf('admin', SchoolRole.ADMIN, status)]);
        await expect(authorization.assertSchoolAdmin({ userId: 'admin' }, SCHOOL_ID)).rejects.toBeInstanceOf(
          SchoolMembershipActionForbiddenException,
        );
      },
    );

    it('refuses someone who is not a member', async () => {
      const { authorization } = world([]);
      await expect(authorization.assertSchoolAdmin({ userId: 'ghost' }, SCHOOL_ID)).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
    });

    it('counts the platform administrator as the school administrator', async () => {
      const { authorization } = world([]);
      await expect(
        authorization.assertSchoolAdmin({ userId: 'root', platformAdmin: true }, SCHOOL_ID),
      ).resolves.toBeUndefined();
    });
  });

  describe('isActiveMember', () => {
    it('is true for an active member or administrator', async () => {
      const { authorization } = world([
        membershipOf('admin', SchoolRole.ADMIN),
        membershipOf('member', SchoolRole.MEMBER),
      ]);
      expect(await authorization.isActiveMember({ userId: 'admin' }, SCHOOL_ID)).toBe(true);
      expect(await authorization.isActiveMember({ userId: 'member' }, SCHOOL_ID)).toBe(true);
    });

    it('is false for a suspended member or a stranger', async () => {
      const { authorization } = world([membershipOf('member', SchoolRole.MEMBER, MembershipStatus.SUSPENDED)]);
      expect(await authorization.isActiveMember({ userId: 'member' }, SCHOOL_ID)).toBe(false);
      expect(await authorization.isActiveMember({ userId: 'ghost' }, SCHOOL_ID)).toBe(false);
    });
  });

  describe('assertSchoolWritable', () => {
    it('returns the school when it is open', async () => {
      const { authorization } = world([]);
      await expect(authorization.assertSchoolWritable(SCHOOL_ID)).resolves.toMatchObject({
        name: 'École test',
      });
    });

    it('refuses a BLOCKED school for everybody', async () => {
      const { authorization } = world([], { schoolStatus: SchoolStatus.BLOCKED });
      await expect(authorization.assertSchoolWritable(SCHOOL_ID)).rejects.toBeInstanceOf(
        InvalidSchoolException,
      );
    });

    it('refuses an unknown school', async () => {
      const { memberships } = world([]);
      const unknown = new SchoolAuthorizationService(memberships.repo, {
        findById: async () => null,
      } as never);
      await expect(unknown.assertSchoolWritable(SCHOOL_ID)).rejects.toBeInstanceOf(
        SchoolNotFoundException,
      );
    });
  });

  describe('assertCanManageTarget', () => {
    const members = () => [
      membershipOf('admin', SchoolRole.ADMIN),
      membershipOf('member', SchoolRole.MEMBER),
    ];

    it('lets the administrator act on a member', () => {
      const w = world(members());
      expect(() =>
        w.authorization.assertCanManageTarget({ userId: 'admin' }, w.memberships.get('member')),
      ).not.toThrow();
    });

    it('refuses acting on another administrator', () => {
      const w = world(members());
      expect(() =>
        w.authorization.assertCanManageTarget({ userId: 'root', platformAdmin: true }, w.memberships.get('admin')),
      ).toThrow(SchoolMembershipActionForbiddenException);
    });

    it('leaves the missing target to the use case', () => {
      const w = world(members());
      expect(() => w.authorization.assertCanManageTarget({ userId: 'admin' }, null)).not.toThrow();
    });
  });
});
