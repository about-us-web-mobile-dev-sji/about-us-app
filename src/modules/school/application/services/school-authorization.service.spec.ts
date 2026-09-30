import { describe, expect, it } from 'vitest';
import { GlobalRole } from '../../../user/domain/enum/global-role.enum.js';
import { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import { MembershipRole } from '../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../domain/enums/school-action.enum.js';
import { SchoolMembershipActionForbiddenException } from '../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolStatus } from '../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../domain/exceptions/invalid-school.exception.js';
import { SchoolNotFoundException } from '../../domain/exceptions/school-not-found.exception.js';
import type { SchoolRepository } from '../../domain/repositories/i-school.repository.js';
import type { SchoolMembershipRepository } from '../../domain/repositories/i-school-membership.repository.js';
import { SchoolAuthorizationService } from './school-authorization.service.js';

describe('SchoolAuthorizationService', () => {
  const schoolId = '11111111-1111-4111-8111-111111111111';
  const otherSchoolId = '99999999-9999-4999-8999-999999999999';
  const userId = 'user-1';

  const membership = (
    role: MembershipRole,
    status: MembershipStatus,
    sId = schoolId,
    grantedPermissions: SchoolAction[] = [],
  ) =>
    SchoolMembership.reconstitute({
      id: 'm-1',
      schoolId: sId,
      userId,
      role,
      status,
      grantedBy: 'super',
      grantedAt: new Date(),
      revokedAt: null,
      revokedBy: null,
      grantedPermissions,
    });

  const serviceWith = (memberships: SchoolMembership[]) =>
    new SchoolAuthorizationService({
      findBySchoolAndUser: async (sId: string, uId: string) =>
        memberships.find((m) => m.schoolId === sId && m.userId === uId) ?? null,
    } as unknown as SchoolMembershipRepository, {
      findById: async () => null,
    } as unknown as SchoolRepository);

  const user = { userId, globalRole: GlobalRole.USER };

  it('always lets a super admin through, even without membership', async () => {
    const service = serviceWith([]);
    for (const action of Object.values(SchoolAction)) {
      await expect(
        service.assertCan({ userId: 'root', globalRole: GlobalRole.SUPER_ADMIN }, action, schoolId),
      ).resolves.toBeUndefined();
    }
  });

  it('lets an active school admin perform admin actions', async () => {
    const service = serviceWith([membership(MembershipRole.SCHOOL_ADMIN, MembershipStatus.ACTIVE)]);
    for (const action of [
      SchoolAction.INVITE_MEMBER,
      SchoolAction.SUSPEND_MEMBER,
      SchoolAction.CANCEL_SUSPENSION,
      SchoolAction.REVOKE_MEMBER,
      SchoolAction.CHANGE_MEMBER_ROLE,
      SchoolAction.VIEW_MEMBERS,
      SchoolAction.VIEW_MEMBER_DETAILS,
      SchoolAction.UPDATE_SCHOOL,
      SchoolAction.MANAGE_MEMBER_PERMISSIONS,
    ]) {
      await expect(service.assertCan(user, action, schoolId)).resolves.toBeUndefined();
    }
  });

  it('reserves INVITE_ADMIN to the super admin, even for an active school admin', async () => {
    const service = serviceWith([membership(MembershipRole.SCHOOL_ADMIN, MembershipStatus.ACTIVE)]);
    await expect(service.assertCan(user, SchoolAction.INVITE_ADMIN, schoolId)).rejects.toBeInstanceOf(
      SchoolMembershipActionForbiddenException,
    );
  });

  it.each([MembershipStatus.SUSPENDED, MembershipStatus.INACTIVE, MembershipStatus.REVOKED])(
    'refuses a school admin whose membership is %s',
    async (status) => {
      const service = serviceWith([membership(MembershipRole.SCHOOL_ADMIN, status)]);
      await expect(service.assertCan(user, SchoolAction.SUSPEND_MEMBER, schoolId)).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
    },
  );

  it('gives a simple member nothing by default', async () => {
    const service = serviceWith([membership(MembershipRole.SCHOOL_MEMBER, MembershipStatus.ACTIVE)]);
    for (const action of Object.values(SchoolAction)) {
      await expect(service.assertCan(user, action, schoolId)).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
    }
    expect(await service.getPermissionsFor(user, schoolId)).toEqual([]);
  });

  describe('delegated permissions', () => {
    const delegate = (status = MembershipStatus.ACTIVE) =>
      serviceWith([
        membership(MembershipRole.SCHOOL_MEMBER, status, schoolId, [
          SchoolAction.VIEW_MEMBERS,
          SchoolAction.SUSPEND_MEMBER,
        ]),
      ]);

    it('lets an ACTIVE delegate use exactly what was granted', async () => {
      const service = delegate();
      await expect(service.assertCan(user, SchoolAction.SUSPEND_MEMBER, schoolId)).resolves.toBeUndefined();
      await expect(service.assertCan(user, SchoolAction.REVOKE_MEMBER, schoolId)).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
      expect(await service.getPermissionsFor(user, schoolId)).toEqual([
        SchoolAction.VIEW_MEMBERS,
        SchoolAction.SUSPEND_MEMBER,
      ]);
    });

    it.each([MembershipStatus.SUSPENDED, MembershipStatus.INACTIVE, MembershipStatus.REVOKED])(
      'ignores granted permissions when the membership is %s',
      async (status) => {
        const service = delegate(status);
        await expect(service.assertCan(user, SchoolAction.SUSPEND_MEMBER, schoolId)).rejects.toBeInstanceOf(
          SchoolMembershipActionForbiddenException,
        );
        expect(await service.getPermissionsFor(user, schoolId)).toEqual([]);
      },
    );

    it('unites role permissions and granted ones without duplicates for an admin', async () => {
      const service = serviceWith([
        membership(MembershipRole.SCHOOL_ADMIN, MembershipStatus.ACTIVE, schoolId, [SchoolAction.VIEW_MEMBERS]),
      ]);
      const actions = await service.getPermissionsFor(user, schoolId);
      expect(actions.filter((a) => a === SchoolAction.VIEW_MEMBERS)).toHaveLength(1);
      expect(actions).toContain(SchoolAction.MANAGE_MEMBER_PERMISSIONS);
      expect(actions).not.toContain(SchoolAction.INVITE_ADMIN);
    });

    it('gives a super admin every action, and a stranger none', async () => {
      const service = serviceWith([]);
      expect(
        await service.getPermissionsFor({ userId: 'root', globalRole: GlobalRole.SUPER_ADMIN }, schoolId),
      ).toEqual(Object.values(SchoolAction));
      expect(await service.getPermissionsFor(user, schoolId)).toEqual([]);
    });
  });

  it('refuses a non-member, and an admin of another school', async () => {
    const service = serviceWith([
      membership(MembershipRole.SCHOOL_ADMIN, MembershipStatus.ACTIVE, otherSchoolId),
    ]);
    await expect(service.assertCan(user, SchoolAction.VIEW_MEMBERS, schoolId)).rejects.toBeInstanceOf(
      SchoolMembershipActionForbiddenException,
    );
    await expect(
      serviceWith([]).assertCan(user, SchoolAction.INVITE_MEMBER, schoolId),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });

  describe('assertSchoolWritable', () => {
    const withSchool = (found: 'active' | 'blocked' | 'none') =>
      new SchoolAuthorizationService({} as SchoolMembershipRepository, {
        findById: async () =>
          found === 'none'
            ? null
            : { status: found === 'blocked' ? SchoolStatus.BLOCKED : SchoolStatus.ACTIVE },
      } as unknown as SchoolRepository);

    it('accepts an active school', async () => {
      await expect(withSchool('active').assertSchoolWritable(user, schoolId)).resolves.toBeUndefined();
    });

    it('refuses a BLOCKED school for a non super admin', async () => {
      await expect(withSchool('blocked').assertSchoolWritable(user, schoolId)).rejects.toBeInstanceOf(
        InvalidSchoolException,
      );
    });

    it('lets a super admin write on a BLOCKED school', async () => {
      await expect(
        withSchool('blocked').assertSchoolWritable({ userId: 'root', globalRole: GlobalRole.SUPER_ADMIN }, schoolId),
      ).resolves.toBeUndefined();
    });

    it('throws when the school does not exist', async () => {
      await expect(withSchool('none').assertSchoolWritable(user, schoolId)).rejects.toBeInstanceOf(
        SchoolNotFoundException,
      );
    });
  });
});
