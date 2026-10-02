import { describe, expect, it } from 'vitest';
import { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import {
  SCHOOL_ID as schoolId,
  authorizationFor,
  inMemoryMemberships,
  membershipOf,
  recordingEmitter,
  schoolsRepo,
} from '../../../testing/school-test-helpers.js';
import { GetSchoolMemberPermissionsUseCase } from './get-school-member-permissions.js';
import { GetMySchoolPermissionsUseCase } from '../get-my-school-permissions/get-my-school-permissions.js';

describe('permission queries', () => {
  const roster = () => [
    membershipOf('admin-1', MembershipRole.SCHOOL_ADMIN),
    membershipOf('delegate-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, [SchoolAction.VIEW_MEMBERS, SchoolAction.SUSPEND_MEMBER]),
    membershipOf('suspended-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.SUSPENDED, [SchoolAction.VIEW_MEMBERS]),
    membershipOf('member-1'),
  ];
  const user = GlobalRole.USER;

  describe('GET members/:id/permissions', () => {
    const setup = () => {
      const store = inMemoryMemberships(roster());
      return new GetSchoolMemberPermissionsUseCase(store.repo, authorizationFor(store.repo, schoolsRepo()));
    };

    it('shows the delegated permissions to an admin (blocked school stays readable)', async () => {
      const out = await setup().handle({ schoolId, memberUserId: 'delegate-1', performedBy: 'admin-1', performedByGlobalRole: user });
      expect(out.membership.grantedPermissions).toEqual([SchoolAction.VIEW_MEMBERS, SchoolAction.SUSPEND_MEMBER]);
    });

    it('refuses a delegate and answers 404 for an unknown member', async () => {
      await expect(
        setup().handle({ schoolId, memberUserId: 'member-1', performedBy: 'delegate-1', performedByGlobalRole: user }),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
      await expect(
        setup().handle({ schoolId, memberUserId: 'ghost', performedBy: 'admin-1', performedByGlobalRole: user }),
      ).rejects.toBeInstanceOf(SchoolMembershipNotFoundException);
    });
  });

  describe('GET me/permissions', () => {
    const setup = (found = true) => {
      const store = inMemoryMemberships(roster());
      const schools = schoolsRepo(SchoolStatus.ACTIVE, found);
      return new GetMySchoolPermissionsUseCase(schools, store.repo, authorizationFor(store.repo, schools));
    };
    const me = (performedBy: string, performedByGlobalRole = user) => ({ schoolId, performedBy, performedByGlobalRole });

    it('returns role, status and effective actions of an ACTIVE delegate', async () => {
      expect(await setup().handle(me('delegate-1'))).toEqual({
        role: MembershipRole.SCHOOL_MEMBER,
        status: MembershipStatus.ACTIVE,
        actions: [SchoolAction.VIEW_MEMBERS, SchoolAction.SUSPEND_MEMBER],
      });
    });

    it('returns no action for a plain member and for a suspended delegate (status still visible)', async () => {
      expect(await setup().handle(me('member-1'))).toMatchObject({ status: MembershipStatus.ACTIVE, actions: [] });
      expect(await setup().handle(me('suspended-1'))).toEqual({
        role: MembershipRole.SCHOOL_MEMBER,
        status: MembershipStatus.SUSPENDED,
        actions: [],
      });
    });

    it('returns the admin actions, MANAGE_MEMBER_PERMISSIONS included', async () => {
      const out = await setup().handle(me('admin-1'));
      expect(out.role).toBe(MembershipRole.SCHOOL_ADMIN);
      expect(out.actions).toContain(SchoolAction.MANAGE_MEMBER_PERMISSIONS);
      expect(out.actions).not.toContain(SchoolAction.INVITE_ADMIN);
    });

    it('returns every action to a super admin, with a null role when not a member', async () => {
      const out = await setup().handle(me('root', GlobalRole.SUPER_ADMIN));
      expect(out).toEqual({ role: null, status: null, actions: Object.values(SchoolAction) });
    });

    it('answers 403 to a stranger and 404 for an unknown school', async () => {
      await expect(setup().handle(me('stranger'))).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
      await expect(setup(false).handle(me('admin-1'))).rejects.toThrow();
    });
  });
});
