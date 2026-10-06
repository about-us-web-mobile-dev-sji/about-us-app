import { beforeEach, describe, expect, it } from 'vitest';
import { AssignSchoolMemberRoleUseCase } from './assign-school-member-role/assign-school-member-role.js';
import { RemoveSchoolMemberRoleUseCase } from './remove-school-member-role/remove-school-member-role.js';
import { MembershipStatus } from '../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../domain/enums/school-action.enum.js';
import { SchoolStatus } from '../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../domain/exceptions/invalid-school.exception.js';
import { InvalidSchoolMembershipException } from '../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolMembershipNotFoundException } from '../../../domain/exceptions/school-membership-not-found.exception.js';
import { SchoolRoleNotFoundException } from '../../../domain/exceptions/school-role-not-found.exception.js';
import {
  ROLE,
  SCHOOL_ID,
  customRole,
  defaultRoles,
  membershipOf,
  recordingEmitter,
  world,
} from '../../testing/school-test-helpers.js';
import type { SchoolMembership } from '../../../domain/entities/school-membership.entity.js';

const customRoles = () => [
  customRole('role-assigner', 'Affectateur', [SchoolAction.ASSIGN_ROLES, SchoolAction.VIEW_MEMBERS]),
  customRole('role-surv', 'Surveillant', [SchoolAction.SUSPEND_MEMBER]),
  customRole('role-badge', 'Badge', [SchoolAction.VIEW_MEMBERS]),
  customRole('role-foreign', 'Étranger', [], 'other-school'),
];

describe('assigning and removing school roles', () => {
  let events: ReturnType<typeof recordingEmitter>['events'];

  const setup = (members: SchoolMembership[], schoolStatus = SchoolStatus.ACTIVE) => {
    const rec = recordingEmitter();
    events = rec.events;
    const w = world(members, { roles: [...defaultRoles(), ...customRoles()], schoolStatus });
    return {
      w,
      assign: new AssignSchoolMemberRoleUseCase(w.memberships.repo, w.roles.repo, w.authorization, rec.emitter),
      remove: new RemoveSchoolMemberRoleUseCase(w.memberships.repo, w.roles.repo, w.authorization, rec.emitter),
    };
  };

  const members = () => [
    membershipOf('admin', [ROLE.admin]),
    membershipOf('asg', ['role-assigner']),
    membershipOf('student', [ROLE.student]),
    membershipOf('surv', ['role-surv']),
  ];
  const call = (performedBy: string, roleId: string, memberUserId = 'student') => ({
    schoolId: SCHOOL_ID,
    memberUserId,
    roleId,
    performedBy,
  });

  beforeEach(() => {
    events = [];
  });

  describe('assign', () => {
    it('lets the administrator add a role, keeps the others, and logs it', async () => {
      const { assign, w } = setup(members());
      const { membership, changed } = await assign.handle(call('admin', ROLE.staff));

      expect(changed).toBe(true);
      expect(membership.roleIds).toEqual([ROLE.student, ROLE.staff]);
      expect(w.memberships.get('student').roleIds).toEqual([ROLE.student, ROLE.staff]);
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('school.member-role.changed');
      expect(events[0].payload).toMatchObject({
        memberUserId: 'student',
        roleId: ROLE.staff,
        change: 'ASSIGNED',
        changedBy: 'admin',
        recipientIds: ['student'],
      });
    });

    it('is idempotent and logs nothing the second time', async () => {
      const { assign } = setup(members());
      await assign.handle(call('admin', ROLE.staff));
      events.length = 0;
      const { changed } = await assign.handle(call('admin', ROLE.staff));
      expect(changed).toBe(false);
      expect(events).toHaveLength(0);
    });

    it('lets an assigner hand out a role whose permissions it holds', async () => {
      const { assign } = setup(members());
      await expect(assign.handle(call('asg', 'role-badge'))).resolves.toBeDefined();
      await expect(assign.handle(call('asg', ROLE.student))).resolves.toBeDefined();
    });

    it('refuses an assigner handing out permissions it does not hold (anti-escalation)', async () => {
      const { assign } = setup(members());
      await expect(assign.handle(call('asg', 'role-surv'))).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
    });

    it('never gives the administrator role', async () => {
      const { assign } = setup(members());
      await expect(assign.handle(call('admin', ROLE.admin))).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
    });

    it('refuses an assigner acting on the administrator, on itself and on a protected peer', async () => {
      const { assign } = setup(members());
      for (const target of ['admin', 'asg', 'surv']) {
        await expect(assign.handle(call('asg', 'role-badge', target))).rejects.toBeInstanceOf(
          SchoolMembershipActionForbiddenException,
        );
      }
    });

    it('refuses someone without ASSIGN_ROLES', async () => {
      const { assign } = setup(members());
      for (const performedBy of ['student', 'surv', 'ghost']) {
        await expect(assign.handle(call(performedBy, ROLE.staff))).rejects.toBeInstanceOf(
          SchoolMembershipActionForbiddenException,
        );
      }
    });

    it('rejects an unknown role, a role of another school and an unknown member', async () => {
      const { assign } = setup(members());
      for (const roleId of ['nope', 'role-foreign']) {
        await expect(assign.handle(call('admin', roleId))).rejects.toBeInstanceOf(SchoolRoleNotFoundException);
      }
      await expect(assign.handle(call('admin', ROLE.staff, 'ghost'))).rejects.toBeInstanceOf(
        SchoolMembershipNotFoundException,
      );
    });

    it('refuses a revoked member', async () => {
      const { assign } = setup([
        membershipOf('admin', [ROLE.admin]),
        membershipOf('student', [ROLE.student], MembershipStatus.REVOKED),
      ]);
      await expect(assign.handle(call('admin', ROLE.staff))).rejects.toBeInstanceOf(
        InvalidSchoolMembershipException,
      );
    });

    it('refuses everybody when the school is blocked', async () => {
      const { assign } = setup(members(), SchoolStatus.BLOCKED);
      await expect(assign.handle(call('admin', ROLE.staff))).rejects.toBeInstanceOf(InvalidSchoolException);
    });
  });

  describe('remove', () => {
    const withTwoRoles = () => [
      membershipOf('admin', [ROLE.admin]),
      membershipOf('asg', ['role-assigner']),
      membershipOf('student', [ROLE.student, ROLE.staff]),
    ];

    it('removes a role and logs it', async () => {
      const { remove, w } = setup(withTwoRoles());
      const { changed } = await remove.handle(call('admin', ROLE.staff));

      expect(changed).toBe(true);
      expect(w.memberships.get('student').roleIds).toEqual([ROLE.student]);
      expect(events[0].payload).toMatchObject({ change: 'REMOVED', roleId: ROLE.staff });
    });

    it('never removes the last role', async () => {
      const { remove } = setup(withTwoRoles());
      await expect(remove.handle(call('admin', ROLE.student))).resolves.toMatchObject({ changed: true });
      await expect(remove.handle(call('admin', ROLE.staff))).rejects.toBeInstanceOf(
        InvalidSchoolMembershipException,
      );
    });

    it('is idempotent when the role is not held', async () => {
      const { remove } = setup(withTwoRoles());
      const { changed } = await remove.handle(call('admin', 'role-badge'));
      expect(changed).toBe(false);
      expect(events).toHaveLength(0);
    });

    it('never removes the administrator role', async () => {
      const { remove } = setup(withTwoRoles());
      await expect(remove.handle(call('admin', ROLE.admin, 'admin'))).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
    });

    it('lets an assigner remove a role from an ordinary member, not from the administrator', async () => {
      const { remove } = setup(withTwoRoles());
      await expect(remove.handle(call('asg', ROLE.staff))).resolves.toBeDefined();
      await expect(remove.handle(call('asg', ROLE.student, 'admin'))).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
    });

    it('refuses someone without ASSIGN_ROLES and a blocked school', async () => {
      const { remove } = setup(withTwoRoles());
      await expect(remove.handle(call('student', ROLE.staff))).rejects.toBeInstanceOf(
        SchoolMembershipActionForbiddenException,
      );
      const blocked = setup(withTwoRoles(), SchoolStatus.BLOCKED);
      await expect(blocked.remove.handle(call('admin', ROLE.staff))).rejects.toBeInstanceOf(InvalidSchoolException);
    });
  });
});
