import { beforeEach, describe, expect, it } from 'vitest';
import { CreateSchoolRoleUseCase } from './create-school-role/create-school-role.js';
import { UpdateSchoolRoleUseCase } from './update-school-role/update-school-role.js';
import { DeleteSchoolRoleUseCase } from './delete-school-role/delete-school-role.js';
import { ListSchoolRolesUseCase } from '../queries/list-school-roles/list-school-roles.js';
import { MembershipStatus } from '../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../domain/enums/school-action.enum.js';
import { SchoolStatus } from '../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../domain/exceptions/invalid-school.exception.js';
import { InvalidSchoolRoleException } from '../../../domain/exceptions/invalid-school-role.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolRoleInUseException } from '../../../domain/exceptions/school-role-in-use.exception.js';
import { SchoolRoleNameAlreadyExistsException } from '../../../domain/exceptions/school-role-name-already-exists.exception.js';
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

// Can manage roles but holds nothing else, and a role manager that can also invite.
// Built per test: the in-memory repository hands out the very same instances.
const customRoles = () => [
  customRole('role-manager', 'Gestionnaire', [SchoolAction.MANAGE_ROLES, SchoolAction.INVITE_MEMBER]),
  customRole('role-assigner', 'Affectateur', [SchoolAction.ASSIGN_ROLES]),
  customRole('role-badge', 'Badge', [SchoolAction.VIEW_MEMBERS]),
];

describe('school role management', () => {
  let events: ReturnType<typeof recordingEmitter>['events'];
  let emitter: ReturnType<typeof recordingEmitter>['emitter'];

  const setup = (members: SchoolMembership[], schoolStatus = SchoolStatus.ACTIVE) => {
    ({ emitter, events } = recordingEmitter());
    const w = world(members, { roles: [...defaultRoles(), ...customRoles()], schoolStatus });
    return {
      w,
      create: new CreateSchoolRoleUseCase(w.roles.repo, w.authorization, emitter),
      update: new UpdateSchoolRoleUseCase(w.roles.repo, w.authorization, emitter),
      remove: new DeleteSchoolRoleUseCase(w.roles.repo, w.memberships.repo, w.authorization, emitter),
      list: new ListSchoolRolesUseCase(w.roles.repo, w.memberships.repo, w.authorization),
    };
  };

  const members = () => [
    membershipOf('admin', [ROLE.admin]),
    membershipOf('mgr', ['role-manager']),
    membershipOf('student', [ROLE.student]),
    membershipOf('holder', ['role-badge']),
  ];

  beforeEach(() => {
    events = [];
  });

  describe('create', () => {
    it('lets the administrator create a role and logs it', async () => {
      const { create } = setup(members());
      const { role } = await create.handle({
        schoolId: SCHOOL_ID,
        name: 'Surveillant',
        description: 'Surveille',
        permissions: [SchoolAction.SUSPEND_MEMBER, SchoolAction.MANAGE_ROLES],
        performedBy: 'admin',
      });

      expect(role).toMatchObject({ name: 'Surveillant', isSystem: false, key: null });
      expect(role.permissions).toEqual([SchoolAction.SUSPEND_MEMBER, SchoolAction.MANAGE_ROLES]);
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('school.role.changed');
      expect(events[0].payload).toMatchObject({ change: 'CREATED', roleName: 'Surveillant', changedBy: 'admin' });
    });

    it('refuses a duplicate name, case-insensitively', async () => {
      const { create } = setup(members());
      await expect(
        create.handle({ schoolId: SCHOOL_ID, name: 'personnel', performedBy: 'admin' }),
      ).rejects.toBeInstanceOf(SchoolRoleNameAlreadyExistsException);
    });

    it('refuses an invalid name', async () => {
      const { create } = setup(members());
      await expect(
        create.handle({ schoolId: SCHOOL_ID, name: '  ', performedBy: 'admin' }),
      ).rejects.toBeInstanceOf(InvalidSchoolRoleException);
    });

    it('refuses someone without MANAGE_ROLES', async () => {
      const { create } = setup(members());
      for (const performedBy of ['student', 'holder', 'ghost']) {
        await expect(
          create.handle({ schoolId: SCHOOL_ID, name: 'Nouveau', performedBy }),
        ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
      }
    });

    it('lets a role manager hand out only what it holds', async () => {
      const { create } = setup(members());
      await expect(
        create.handle({ schoolId: SCHOOL_ID, name: 'Recruteur', permissions: [SchoolAction.INVITE_MEMBER], performedBy: 'mgr' }),
      ).resolves.toBeDefined();
      await expect(
        create.handle({ schoolId: SCHOOL_ID, name: 'Chef', permissions: [SchoolAction.REVOKE_MEMBER], performedBy: 'mgr' }),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });

    it('reserves MANAGE_ROLES inside a role to the administrator', async () => {
      const { create } = setup(members());
      await expect(
        create.handle({ schoolId: SCHOOL_ID, name: 'Clone', permissions: [SchoolAction.MANAGE_ROLES], performedBy: 'mgr' }),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });

    it('refuses everybody when the school is blocked', async () => {
      const { create } = setup(members(), SchoolStatus.BLOCKED);
      await expect(
        create.handle({ schoolId: SCHOOL_ID, name: 'Nouveau', performedBy: 'admin' }),
      ).rejects.toBeInstanceOf(InvalidSchoolException);
    });

    it('refuses a suspended administrator', async () => {
      const { create } = setup([membershipOf('admin', [ROLE.admin], MembershipStatus.SUSPENDED)]);
      await expect(
        create.handle({ schoolId: SCHOOL_ID, name: 'Nouveau', performedBy: 'admin' }),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });
  });

  describe('update', () => {
    it('tunes the permissions of a system role', async () => {
      const { update } = setup(members());
      const { role } = await update.handle({
        schoolId: SCHOOL_ID,
        roleId: ROLE.staff,
        permissions: [SchoolAction.VIEW_MEMBERS, SchoolAction.VIEW_MEMBER_DETAILS],
        performedBy: 'admin',
      });
      expect(role.permissions).toEqual([SchoolAction.VIEW_MEMBERS, SchoolAction.VIEW_MEMBER_DETAILS]);
      expect(events[0].payload).toMatchObject({ change: 'UPDATED' });
    });

    it('renames a custom role but not a system role', async () => {
      const { update } = setup(members());
      const { role } = await update.handle({ schoolId: SCHOOL_ID, roleId: 'role-badge', name: 'Carte', performedBy: 'admin' });
      expect(role.name).toBe('Carte');
      await expect(
        update.handle({ schoolId: SCHOOL_ID, roleId: ROLE.student, name: 'Autre', performedBy: 'admin' }),
      ).rejects.toBeInstanceOf(InvalidSchoolRoleException);
    });

    it('never modifies the administrator role', async () => {
      const { update } = setup(members());
      await expect(
        update.handle({ schoolId: SCHOOL_ID, roleId: ROLE.admin, permissions: [], performedBy: 'admin' }),
      ).rejects.toBeInstanceOf(InvalidSchoolRoleException);
    });

    it('refuses a name already used by another role', async () => {
      const { update } = setup(members());
      await expect(
        update.handle({ schoolId: SCHOOL_ID, roleId: 'role-badge', name: 'Gestionnaire', performedBy: 'admin' }),
      ).rejects.toBeInstanceOf(SchoolRoleNameAlreadyExistsException);
    });

    it('refuses a role manager adding a permission it does not hold, but allows removing one', async () => {
      const { update } = setup(members());
      await expect(
        update.handle({ schoolId: SCHOOL_ID, roleId: 'role-badge', permissions: [SchoolAction.VIEW_MEMBERS, SchoolAction.REVOKE_MEMBER], performedBy: 'mgr' }),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
      await expect(
        update.handle({ schoolId: SCHOOL_ID, roleId: 'role-badge', permissions: [], performedBy: 'mgr' }),
      ).resolves.toBeDefined();
    });

    it('rejects an unknown role and someone without MANAGE_ROLES', async () => {
      const { update } = setup(members());
      await expect(
        update.handle({ schoolId: SCHOOL_ID, roleId: 'nope', name: 'x', performedBy: 'admin' }),
      ).rejects.toBeInstanceOf(SchoolRoleNotFoundException);
      await expect(
        update.handle({ schoolId: SCHOOL_ID, roleId: 'role-badge', name: 'x', performedBy: 'student' }),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });
  });

  describe('delete', () => {
    it('deletes an unused custom role and logs it', async () => {
      const { remove, w } = setup([membershipOf('admin', [ROLE.admin]), membershipOf('student', [ROLE.student])]);
      await remove.handle({ schoolId: SCHOOL_ID, roleId: 'role-badge', performedBy: 'admin' });
      expect(w.roles.all().find((r) => r.id === 'role-badge')).toBeUndefined();
      expect(events[0].payload).toMatchObject({ change: 'DELETED', roleName: 'Badge' });
    });

    it('refuses a role still held by a member', async () => {
      const { remove } = setup(members());
      await expect(
        remove.handle({ schoolId: SCHOOL_ID, roleId: 'role-badge', performedBy: 'admin' }),
      ).rejects.toBeInstanceOf(SchoolRoleInUseException);
    });

    it('ignores revoked holders', async () => {
      const { remove } = setup([
        membershipOf('admin', [ROLE.admin]),
        membershipOf('gone', ['role-badge'], MembershipStatus.REVOKED),
      ]);
      await expect(
        remove.handle({ schoolId: SCHOOL_ID, roleId: 'role-badge', performedBy: 'admin' }),
      ).resolves.toBeDefined();
    });

    it('never deletes a system role', async () => {
      const { remove } = setup(members());
      for (const roleId of [ROLE.admin, ROLE.staff, ROLE.student]) {
        await expect(
          remove.handle({ schoolId: SCHOOL_ID, roleId, performedBy: 'admin' }),
        ).rejects.toBeInstanceOf(InvalidSchoolRoleException);
      }
    });

    it('refuses someone without MANAGE_ROLES', async () => {
      const { remove } = setup(members());
      await expect(
        remove.handle({ schoolId: SCHOOL_ID, roleId: 'role-badge', performedBy: 'student' }),
      ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    });
  });

  describe('list', () => {
    it('lists the roles of the school with their live members count', async () => {
      const { list } = setup([...members(), membershipOf('gone', ['role-badge'], MembershipStatus.REVOKED)]);
      const { roles } = await list.handle({ schoolId: SCHOOL_ID, performedBy: 'admin' });

      expect(roles.map((r) => r.name)).toEqual(
        expect.arrayContaining(['Administrateur école', 'Personnel', 'Élève', 'Badge']),
      );
      expect(roles.find((r) => r.id === 'role-badge')?.membersCount).toBe(1);
      expect(roles.find((r) => r.id === ROLE.admin)?.membersCount).toBe(1);
    });

    it('is open to who can assign roles as well as who can manage them', async () => {
      const { list } = setup([...members(), membershipOf('asg', ['role-assigner'])]);
      await expect(list.handle({ schoolId: SCHOOL_ID, performedBy: 'asg' })).resolves.toBeDefined();
      await expect(list.handle({ schoolId: SCHOOL_ID, performedBy: 'mgr' })).resolves.toBeDefined();
    });

    it('is open to who can attach documents to roles (the content manager)', async () => {
      const { list } = setup([...members(), membershipOf('content', [ROLE.contentManager])]);
      await expect(list.handle({ schoolId: SCHOOL_ID, performedBy: 'content' })).resolves.toBeDefined();
    });

    it('refuses everybody else', async () => {
      const { list } = setup(members());
      for (const performedBy of ['student', 'holder', 'ghost']) {
        await expect(list.handle({ schoolId: SCHOOL_ID, performedBy })).rejects.toBeInstanceOf(
          SchoolMembershipActionForbiddenException,
        );
      }
    });
  });
});
