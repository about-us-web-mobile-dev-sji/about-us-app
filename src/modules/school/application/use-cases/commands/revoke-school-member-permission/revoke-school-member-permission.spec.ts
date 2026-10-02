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
import { RevokeSchoolMemberPermissionUseCase } from './revoke-school-member-permission.js';

describe('RevokeSchoolMemberPermissionUseCase', () => {
  const setup = (
    memberships = [
      membershipOf('admin-1', MembershipRole.SCHOOL_ADMIN),
      membershipOf('member-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, [
        SchoolAction.SUSPEND_MEMBER,
        SchoolAction.VIEW_MEMBERS,
      ]),
    ],
    schoolStatus = SchoolStatus.ACTIVE,
  ) => {
    const store = inMemoryMemberships(memberships);
    const schools = schoolsRepo(schoolStatus);
    const { emitter, events } = recordingEmitter();
    const useCase = new RevokeSchoolMemberPermissionUseCase(
      schools,
      store.repo,
      authorizationFor(store.repo, schools),
      emitter,
    );
    return { useCase, store, events };
  };
  const asAdmin = { schoolId, memberUserId: 'member-1', performedBy: 'admin-1', performedByGlobalRole: GlobalRole.USER };

  it('removes a granted action, persists it and emits an event', async () => {
    const { useCase, store, events } = setup();
    const out = await useCase.handle({ ...asAdmin, action: SchoolAction.SUSPEND_MEMBER });
    expect(out.changed).toBe(true);
    expect(store.get('member-1').grantedPermissions).toEqual([SchoolAction.VIEW_MEMBERS]);
    expect(events[0]).toMatchObject({
      name: 'school.member-permission.revoked',
      payload: { memberUserId: 'member-1', action: SchoolAction.SUSPEND_MEMBER, change: 'REVOKED', grantedBy: 'admin-1' },
    });
  });

  it('is idempotent when the action was not held', async () => {
    const { useCase, events } = setup();
    const out = await useCase.handle({ ...asAdmin, action: SchoolAction.REVOKE_MEMBER });
    expect(out.changed).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('refuses a non delegable action (400)', async () => {
    const { useCase } = setup();
    await expect(useCase.handle({ ...asAdmin, action: SchoolAction.MANAGE_MEMBER_PERMISSIONS })).rejects.toBeInstanceOf(
      InvalidSchoolMembershipException,
    );
  });

  it('refuses a non ACTIVE target', async () => {
    const { useCase } = setup([
      membershipOf('admin-1', MembershipRole.SCHOOL_ADMIN),
      membershipOf('member-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.SUSPENDED, [SchoolAction.VIEW_MEMBERS]),
    ]);
    await expect(useCase.handle({ ...asAdmin, action: SchoolAction.VIEW_MEMBERS })).rejects.toBeInstanceOf(
      InvalidSchoolMembershipException,
    );
  });

  it('answers 403 to a delegate trying to remove a peer permission, and to a stranger', async () => {
    const { useCase, store } = setup([
      membershipOf('admin-1', MembershipRole.SCHOOL_ADMIN),
      membershipOf('member-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, [SchoolAction.VIEW_MEMBERS]),
      membershipOf('delegate-1', MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE, [SchoolAction.REVOKE_MEMBER]),
    ]);
    for (const performedBy of ['delegate-1', 'member-1', 'stranger']) {
      await expect(
        useCase.handle({ ...asAdmin, performedBy, action: SchoolAction.VIEW_MEMBERS }),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    }
    expect(store.get('member-1').grantedPermissions).toEqual([SchoolAction.VIEW_MEMBERS]);
  });

  it('refuses on a BLOCKED school for an admin', async () => {
    const { useCase } = setup(undefined, SchoolStatus.BLOCKED);
    await expect(useCase.handle({ ...asAdmin, action: SchoolAction.SUSPEND_MEMBER })).rejects.toBeInstanceOf(
      InvalidSchoolException,
    );
  });
});
