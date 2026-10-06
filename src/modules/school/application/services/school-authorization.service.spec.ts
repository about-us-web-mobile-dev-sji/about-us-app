import { describe, expect, it } from 'vitest';
import {
  ROLE,
  SCHOOL_ID,
  customRole,
  defaultRoles,
  membershipOf,
  world,
} from '../testing/school-test-helpers.js';
import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../domain/enums/school-action.enum.js';
import { SchoolStatus } from '../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../domain/exceptions/invalid-school.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolNotFoundException } from '../../domain/exceptions/school-not-found.exception.js';

const grader = customRole('role-grader', 'Surveillant', [
  SchoolAction.SUSPEND_MEMBER,
  SchoolAction.INVITE_MEMBER,
]);
const roles = () => [...defaultRoles(), grader];

describe('SchoolAuthorizationService', () => {
  describe('assertCan', () => {
    it('lets the administrator do everything', async () => {
      const { authorization } = world([membershipOf('admin', [ROLE.admin])]);
      for (const action of Object.values(SchoolAction)) {
        await expect(authorization.assertCan({ userId: 'admin' }, action, SCHOOL_ID)).resolves.toBeUndefined();
      }
    });

    it('gives a member only what its role carries', async () => {
      const { authorization } = world([membershipOf('staff', [ROLE.staff])]);
      await expect(
        authorization.assertCan({ userId: 'staff' }, SchoolAction.VIEW_MEMBERS, SCHOOL_ID),
      ).resolves.toBeUndefined();
      await expect(
        authorization.assertCan({ userId: 'staff' }, SchoolAction.SUSPEND_MEMBER, SCHOOL_ID),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });

    it('gives a student nothing', async () => {
      const { authorization } = world([membershipOf('student', [ROLE.student])]);
      expect(await authorization.getPermissionsFor({ userId: 'student' }, SCHOOL_ID)).toEqual([]);
    });

    it('unites the permissions of several roles', async () => {
      const { authorization } = world([membershipOf('multi', [ROLE.staff, 'role-grader'])], {
        roles: roles(),
      });
      const actions = await authorization.getPermissionsFor({ userId: 'multi' }, SCHOOL_ID);
      expect(actions.sort()).toEqual(
        [SchoolAction.VIEW_MEMBERS, SchoolAction.SUSPEND_MEMBER, SchoolAction.INVITE_MEMBER].sort(),
      );
    });

    it.each([MembershipStatus.SUSPENDED, MembershipStatus.INACTIVE, MembershipStatus.REVOKED])(
      'gives nothing to a %s membership, even an administrator',
      async (status) => {
        const { authorization } = world([membershipOf('admin', [ROLE.admin], status)]);
        await expect(
          authorization.assertCan({ userId: 'admin' }, SchoolAction.VIEW_MEMBERS, SCHOOL_ID),
        ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
      },
    );

    it('refuses someone who is not a member', async () => {
      const { authorization } = world([]);
      await expect(
        authorization.assertCan({ userId: 'ghost' }, SchoolAction.VIEW_MEMBERS, SCHOOL_ID),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });

    it('ignores roles that belong to another school', async () => {
      const foreign = customRole('role-foreign', 'Étranger', [SchoolAction.REVOKE_MEMBER], 'other-school');
      const { authorization } = world([membershipOf('u', ['role-foreign'])], {
        roles: [...defaultRoles(), foreign],
      });
      expect(await authorization.getPermissionsFor({ userId: 'u' }, SCHOOL_ID)).toEqual([]);
    });
  });

  describe('content manager', () => {
    it('holds the document permissions and nothing of the administration', async () => {
      const { authorization } = world([membershipOf('content', [ROLE.contentManager])]);
      const actions = await authorization.getPermissionsFor({ userId: 'content' }, SCHOOL_ID);
      expect(actions).toEqual(
        expect.arrayContaining([
          SchoolAction.MANAGE_DOCUMENTS,
          SchoolAction.SHARE_DOCUMENTS,
          SchoolAction.VIEW_METRICS,
        ]),
      );
      await expect(
        authorization.assertCan({ userId: 'content' }, SchoolAction.ASSIGN_ROLES, SCHOOL_ID),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });

    it('is not protected like a peer who can suspend or revoke, and cannot hand out admin powers', async () => {
      const w = world([membershipOf('mgr', ['role-grader']), membershipOf('content', [ROLE.contentManager])], {
        roles: [...defaultRoles(), grader],
      });
      await expect(
        w.authorization.assertCanManageTarget({ userId: 'mgr' }, SCHOOL_ID, w.memberships.get('content')),
      ).resolves.toBeUndefined();
      await expect(
        w.authorization.assertCanGrantPermissions({ userId: 'content' }, SCHOOL_ID, [SchoolAction.SUSPEND_MEMBER]),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });
  });

  describe('assertCanAny', () => {
    it('passes when one of the actions is held', async () => {
      const { authorization } = world([membershipOf('g', ['role-grader'])], { roles: roles() });
      await expect(
        authorization.assertCanAny(
          { userId: 'g' },
          [SchoolAction.MANAGE_ROLES, SchoolAction.INVITE_MEMBER],
          SCHOOL_ID,
        ),
      ).resolves.toBeUndefined();
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
      const { authorization, memberships, roles: r } = world([]);
      const unknown = new (authorization.constructor as new (...a: unknown[]) => typeof authorization)(
        memberships.repo,
        r.repo,
        { findById: async () => null },
      );
      await expect(unknown.assertSchoolWritable(SCHOOL_ID)).rejects.toBeInstanceOf(
        SchoolNotFoundException,
      );
    });
  });

  describe('assertCanManageTarget', () => {
    const members = () => [
      membershipOf('admin', [ROLE.admin]),
      membershipOf('grader', ['role-grader']),
      membershipOf('grader2', ['role-grader']),
      membershipOf('student', [ROLE.student]),
    ];

    it('lets the administrator act on anyone', async () => {
      const w = world(members(), { roles: roles() });
      await expect(
        w.authorization.assertCanManageTarget({ userId: 'admin' }, SCHOOL_ID, w.memberships.get('grader')),
      ).resolves.toBeUndefined();
    });

    it('lets a delegate act on an ordinary member', async () => {
      const w = world(members(), { roles: roles() });
      await expect(
        w.authorization.assertCanManageTarget({ userId: 'grader' }, SCHOOL_ID, w.memberships.get('student')),
      ).resolves.toBeUndefined();
    });

    it.each([
      ['themselves', 'grader'],
      ['the administrator', 'admin'],
      ['a peer who can suspend', 'grader2'],
    ])('refuses a delegate acting on %s', async (_label, target) => {
      const w = world(members(), { roles: roles() });
      await expect(
        w.authorization.assertCanManageTarget({ userId: 'grader' }, SCHOOL_ID, w.memberships.get(target)),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });
  });

  describe('assertCanGrantPermissions', () => {
    it('lets the administrator grant anything, MANAGE_ROLES included', async () => {
      const w = world([membershipOf('admin', [ROLE.admin])]);
      await expect(
        w.authorization.assertCanGrantPermissions({ userId: 'admin' }, SCHOOL_ID, Object.values(SchoolAction)),
      ).resolves.toBeUndefined();
    });

    it('lets a delegate grant what it holds', async () => {
      const w = world([membershipOf('g', ['role-grader'])], { roles: roles() });
      await expect(
        w.authorization.assertCanGrantPermissions({ userId: 'g' }, SCHOOL_ID, [SchoolAction.INVITE_MEMBER]),
      ).resolves.toBeUndefined();
    });

    it('refuses to grant a permission the delegate does not hold', async () => {
      const w = world([membershipOf('g', ['role-grader'])], { roles: roles() });
      await expect(
        w.authorization.assertCanGrantPermissions({ userId: 'g' }, SCHOOL_ID, [SchoolAction.REVOKE_MEMBER]),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });

    it('reserves MANAGE_ROLES to the administrator', async () => {
      const manager = customRole('role-mgr', 'Gestionnaire', [SchoolAction.MANAGE_ROLES]);
      const w = world([membershipOf('m', ['role-mgr'])], { roles: [...defaultRoles(), manager] });
      await expect(
        w.authorization.assertCanGrantPermissions({ userId: 'm' }, SCHOOL_ID, [SchoolAction.MANAGE_ROLES]),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });
  });
});
