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
import { GrantSchoolMemberPermissionUseCase } from './grant-school-member-permission.js';

describe('GrantSchoolMemberPermissionUseCase', () => {
  const setup = (
    memberships = [
      membershipOf('admin-1', MembershipRole.SCHOOL_ADMIN),
      membershipOf('member-1'),
    ],
    schoolStatus = SchoolStatus.ACTIVE,
  ) => {
    const store = inMemoryMemberships(memberships);
    const schools = schoolsRepo(schoolStatus);
    const { emitter, events } = recordingEmitter();
    const useCase = new GrantSchoolMemberPermissionUseCase(
      schools,
      store.repo,
      authorizationFor(store.repo, schools),
      emitter,
    );
    return { useCase, store, events };
  };
  const asAdmin = { schoolId, memberUserId: 'member-1', performedBy: 'admin-1', performedByGlobalRole: GlobalRole.USER };

  it('lets a school admin grant a delegable action, persists it and emits an event', async () => {
    const { useCase, store, events } = setup();
    const out = await useCase.handle({ ...asAdmin, action: SchoolAction.SUSPEND_MEMBER });
    expect(out.changed).toBe(true);
    expect(out.membership.grantedPermissions).toEqual([SchoolAction.SUSPEND_MEMBER]);
    expect(store.get('member-1').grantedPermissions).toEqual([SchoolAction.SUSPEND_MEMBER]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'school.member-permission.granted',
      payload: {
        schoolId,
        memberUserId: 'member-1',
        action: SchoolAction.SUSPEND_MEMBER,
        change: 'GRANTED',
        grantedBy: 'admin-1',
      },
    });
  });

  it('lets a super admin without membership grant', async () => {
    const { useCase } = setup();
    const out = await useCase.handle({
      ...asAdmin,
      performedBy: 'root',
      performedByGlobalRole: GlobalRole.SUPER_ADMIN,
      action: SchoolAction.UPDATE_SCHOOL,
    });
    expect(out.membership.grantedPermissions).toEqual([SchoolAction.UPDATE_SCHOOL]);
  });

  it('is idempotent: a second grant changes nothing and emits nothing', async () => {
    const { useCase, events } = setup();
    await useCase.handle({ ...asAdmin, action: SchoolAction.VIEW_MEMBERS });
    const again = await useCase.handle({ ...asAdmin, action: SchoolAction.VIEW_MEMBERS });
    expect(again.changed).toBe(false);
    expect(again.membership.grantedPermissions).toEqual([SchoolAction.VIEW_MEMBERS]);
    expect(events).toHaveLength(1);
  });

  it.each([
    SchoolAction.MANAGE_MEMBER_PERMISSIONS,
    SchoolAction.CHANGE_MEMBER_ROLE,
    SchoolAction.INVITE_ADMIN,
    'REPLACE_ADMIN',
    'BLOCK_SCHOOL',
    'NOT_AN_ACTION',
  ])('refuses the non delegable action %s (400)', async (action) => {
    const { useCase, store, events } = setup();
    await expect(useCase.handle({ ...asAdmin, action })).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
    expect(store.get('member-1').grantedPermissions).toEqual([]);
    expect(events).toHaveLength(0);
  });

  it.each([MembershipStatus.SUSPENDED, MembershipStatus.INACTIVE, MembershipStatus.REVOKED])(
    'refuses a %s target',
    async (status) => {
      const { useCase } = setup([membershipOf('admin-1', MembershipRole.SCHOOL_ADMIN), membershipOf('member-1', MembershipRole.SCHOOL_MEMBER, status)]);
      await expect(useCase.handle({ ...asAdmin, action: SchoolAction.VIEW_MEMBERS })).rejects.toBeInstanceOf(
        InvalidSchoolMembershipException,
      );
    },
  );

  it('refuses to grant to a school administrator', async () => {
    const { useCase } = setup();
    await expect(
      useCase.handle({ ...asAdmin, memberUserId: 'admin-1', action: SchoolAction.VIEW_MEMBERS }),
    ).rejects.toBeInstanceOf(InvalidSchoolMembershipException);
  });

  it('answers 403 to a non-admin: plain member, delegate (even with every delegable action), suspended admin, stranger', async () => {
    const everything = [
      SchoolAction.VIEW_MEMBERS,
      SchoolAction.VIEW_MEMBER_DETAILS,
      SchoolAction.INVITE_MEMBER,
      SchoolAction.SUSPEND_MEMBER,
      SchoolAction.CANCEL_SUSPENSION,
      SchoolAction.REVOKE_MEMBER,
      SchoolAction.UPDATE_SCHOOL,
    ];
    const { useCase, store } = setup([
      membershipOf('admin-1', MembershipRole.SCHOOL_ADMIN),
      membershipOf('admin-2', MembershipRole.SCHOOL_ADMIN, MembershipStatus.SUSPENDED),
      membershipOf('member-1'),
      membershipOf('delegate-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, everything),
    ]);
    for (const performedBy of ['member-1', 'delegate-1', 'admin-2', 'stranger']) {
      await expect(
        useCase.handle({ ...asAdmin, performedBy, action: SchoolAction.VIEW_MEMBERS }),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    }
    expect(store.get('member-1').grantedPermissions).toEqual([]);
  });

  it('refuses on a BLOCKED school for an admin, but not for a super admin', async () => {
    const { useCase } = setup(undefined, SchoolStatus.BLOCKED);
    await expect(useCase.handle({ ...asAdmin, action: SchoolAction.VIEW_MEMBERS })).rejects.toBeInstanceOf(
      InvalidSchoolException,
    );
    await expect(
      useCase.handle({ ...asAdmin, performedBy: 'root', performedByGlobalRole: GlobalRole.SUPER_ADMIN, action: SchoolAction.VIEW_MEMBERS }),
    ).resolves.toMatchObject({ changed: true });
  });

  it('throws when the target is not a member', async () => {
    const { useCase } = setup();
    await expect(
      useCase.handle({ ...asAdmin, memberUserId: 'ghost', action: SchoolAction.VIEW_MEMBERS }),
    ).rejects.toBeInstanceOf(SchoolMembershipNotFoundException);
  });
});
