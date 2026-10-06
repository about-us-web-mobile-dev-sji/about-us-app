import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { UserEntity } from '../../../user/infrastructure/persistence/entity/user.entity.js';
import { AuthIdentityEntity } from '../../../auth/infrastructure/persistence/typeorm/auth-identity.entity.js';
import { AuthSessionEntity } from '../../../auth/infrastructure/persistence/typeorm/auth-session.entity.js';
import { TypeormUserRepository } from '../../../user/infrastructure/persistence/repositories/typeorm-user.repository.js';
import { GlobalRole } from '../../../user/domain/enum/global-role.enum.js';
import UserStatus from '../../../user/domain/enum/user-status.enum.js';
import { SchoolEntity } from './typeorm/school.entity.js';
import { SchoolMembershipEntity } from './typeorm/school-membership.entity.js';
import { SchoolInvitationEntity } from './typeorm/school-invitation.entity.js';
import { SchoolRoleEntity } from './typeorm/school-role.entity.js';
import { PermissionEntity } from './typeorm/permission.entity.js';
import { TypeormSchoolRoleRepository } from './typeorm-school-role.repository.js';
import { TypeormSchoolMembershipRepository } from './typeorm-school-membership.repository.js';
import { TypeormSchoolInvitationRepository } from './typeorm-school-invitation.repository.js';
import { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import { SchoolInvitation } from '../../domain/entities/school-invitation.entity.js';
import { SchoolRole } from '../../domain/entities/school-role.entity.js';
import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../domain/enums/school-action.enum.js';
import { SchoolRoleKey } from '../../domain/enums/school-role-key.enum.js';
import { ensureSystemRoles } from '../../application/services/school-role-provisioning.js';

// Needs a PostgreSQL server (same TEST_DATABASE_URL as the user module tests);
// skipped otherwise. Only the randomly named database created here is dropped.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('school persistence (PostgreSQL)', () => {
  let admin: DataSource;
  let source: DataSource;
  let dbName: string;
  const schoolId = randomUUID();
  const otherSchoolId = randomUUID();
  const ids = { admin: randomUUID(), alice: randomUUID(), bob: randomUUID(), carol: randomUUID() };

  let roles: TypeormSchoolRoleRepository;
  let memberships: TypeormSchoolMembershipRepository;
  let invitations: TypeormSchoolInvitationRepository;

  beforeAll(async () => {
    admin = new DataSource({ type: 'postgres', url });
    await admin.initialize();
    dbName = `about_us_school_${randomUUID().replaceAll('-', '')}`;
    await admin.query(`CREATE DATABASE "${dbName}"`);
    const parsed = new URL(url!);
    source = new DataSource({
      type: 'postgres',
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: dbName,
      synchronize: false,
      entities: [
        UserEntity, AuthIdentityEntity, AuthSessionEntity,
        SchoolEntity, SchoolMembershipEntity, SchoolInvitationEntity, SchoolRoleEntity, PermissionEntity,
      ],
    });
    await source.initialize();
    for (const schema of ['auth', '"user"', 'school']) {
      await source.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    }
    await source.synchronize();

    roles = new TypeormSchoolRoleRepository(source.getRepository(SchoolRoleEntity));
    memberships = new TypeormSchoolMembershipRepository(source.getRepository(SchoolMembershipEntity));
    invitations = new TypeormSchoolInvitationRepository(source.getRepository(SchoolInvitationEntity));

    const users = source.getRepository(UserEntity);
    await users.save([
      { id: ids.admin, firstName: 'Ada', lastName: 'Admin', email: 'ada@ecole.test', status: UserStatus.ACTIVE, globalRole: GlobalRole.USER },
      { id: ids.alice, firstName: 'Alice', lastName: 'Martin', email: 'alice@ecole.test', status: UserStatus.ACTIVE, globalRole: GlobalRole.USER },
      { id: ids.bob, firstName: 'Bob', lastName: 'Durand', email: 'bob@ecole.test', status: UserStatus.ACTIVE, globalRole: GlobalRole.USER },
      { id: ids.carol, firstName: 'Carol', lastName: 'Martin', email: 'carol@ecole.test', status: UserStatus.ACTIVE, globalRole: GlobalRole.USER },
    ] as UserEntity[]);
  }, 60_000);

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    if (admin?.isInitialized) {
      try {
        await admin.query(`DROP DATABASE "${dbName}" WITH (FORCE)`);
      } finally {
        await admin.destroy();
      }
    }
  });

  describe('roles', () => {
    it('creates the five system roles once, with their permissions', async () => {
      const first = await ensureSystemRoles(roles, schoolId);
      const again = await ensureSystemRoles(roles, schoolId);

      expect(Object.keys(first).sort()).toEqual(Object.values(SchoolRoleKey).sort());
      expect(again[SchoolRoleKey.STAFF].id).toBe(first[SchoolRoleKey.STAFF].id);
      expect(first[SchoolRoleKey.SCHOOL_ADMIN].permissions.length).toBe(Object.values(SchoolAction).length);
      expect([...first[SchoolRoleKey.STAFF].permissions]).toEqual([SchoolAction.VIEW_MEMBERS]);
      expect([...first[SchoolRoleKey.STUDENT].permissions]).toEqual([]);
      expect((await roles.findBySchool(schoolId)).length).toBe(5);
    });

    it('creates a custom role, then changes its permissions', async () => {
      const created = await roles.save(
        SchoolRole.createCustom({
          schoolId,
          name: 'Surveillant',
          permissions: [SchoolAction.SUSPEND_MEMBER],
        }),
      );
      expect([...created.permissions]).toEqual([SchoolAction.SUSPEND_MEMBER]);

      created.update({ permissions: [SchoolAction.VIEW_MEMBERS, SchoolAction.INVITE_MEMBER] });
      await roles.save(created);
      const reloaded = await roles.findById(created.id);
      expect([...reloaded!.permissions].sort()).toEqual(
        [SchoolAction.INVITE_MEMBER, SchoolAction.VIEW_MEMBERS].sort(),
      );
      expect(await roles.existsByName(schoolId, 'surveillant')).toBe(true);
      expect(await roles.existsByName(schoolId, 'surveillant', created.id)).toBe(false);
      expect(await roles.existsByName(otherSchoolId, 'surveillant')).toBe(false);
    });

    it('refuses two system roles with the same key in one school', async () => {
      await expect(
        source.getRepository(SchoolRoleEntity).insert({
          schoolId,
          key: SchoolRoleKey.STAFF,
          name: 'Doublon',
          isSystem: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      ).rejects.toThrow();
    });

    it('drops permission codes that left the catalogue', async () => {
      await source.getRepository(PermissionEntity).insert({ code: 'OBSOLETE_PERMISSION', description: null });
      await roles.ensurePermissionCatalogue();
      const codes = (await source.getRepository(PermissionEntity).find()).map((p) => p.code);
      expect(codes).not.toContain('OBSOLETE_PERMISSION');
      expect(codes.sort()).toEqual(Object.values(SchoolAction).sort());
    });
  });

  describe('memberships', () => {
    let adminRoleId: string;
    let staffRoleId: string;
    let studentRoleId: string;

    beforeAll(async () => {
      const system = await ensureSystemRoles(roles, schoolId);
      adminRoleId = system[SchoolRoleKey.SCHOOL_ADMIN].id;
      staffRoleId = system[SchoolRoleKey.STAFF].id;
      studentRoleId = system[SchoolRoleKey.STUDENT].id;

      const make = (userId: string, roleIds: string[], grantedAtOffset: number) => {
        const m = SchoolMembership.create({ schoolId, userId, roleIds, grantedBy: ids.admin });
        return SchoolMembership.reconstitute({
          ...m.toPrimitives(),
          grantedAt: new Date(Date.now() - grantedAtOffset),
        });
      };
      await memberships.save(make(ids.carol, [studentRoleId], 5000));
      await memberships.save(make(ids.bob, [staffRoleId, studentRoleId], 4000));
      await memberships.save(make(ids.alice, [studentRoleId], 3000));
      await memberships.save(make(ids.admin, [adminRoleId], 1000)); // newest, but administrator
    });

    it('stores and reloads the roles of a membership', async () => {
      const bob = await memberships.findBySchoolAndUser(schoolId, ids.bob);
      expect([...bob!.roleIds].sort()).toEqual([staffRoleId, studentRoleId].sort());
    });

    it('updates the roles of a membership', async () => {
      const alice = (await memberships.findBySchoolAndUser(schoolId, ids.alice))!;
      alice.assignRole(staffRoleId);
      await memberships.save(alice);
      expect((await memberships.findBySchoolAndUser(schoolId, ids.alice))!.hasRole(staffRoleId)).toBe(true);
      const reloaded = (await memberships.findBySchoolAndUser(schoolId, ids.alice))!;
      reloaded.removeRole(staffRoleId);
      await memberships.save(reloaded);
      expect((await memberships.findBySchoolAndUser(schoolId, ids.alice))!.roleIds).toEqual([studentRoleId]);
    });

    it('finds the holders of a role', async () => {
      const holders = await memberships.findByRole(staffRoleId);
      expect(holders.map((m) => m.userId)).toEqual([ids.bob]);
    });

    const all = [MembershipStatus.ACTIVE, MembershipStatus.SUSPENDED, MembershipStatus.INACTIVE];

    it('lists the administrator first, then the oldest, with a correct total', async () => {
      const page = await memberships.findBySchoolPaginated(schoolId, { statuses: all }, { page: 1, limit: 10 });
      expect(page.total).toBe(4);
      expect(page.items.map((m) => m.userId)).toEqual([ids.admin, ids.carol, ids.bob, ids.alice]);
      expect(page.items[0].roleIds).toEqual([adminRoleId]);
      expect(page.totalPages).toBe(1);
    });

    it('paginates without duplicates or gaps', async () => {
      const first = await memberships.findBySchoolPaginated(schoolId, { statuses: all }, { page: 1, limit: 3 });
      const second = await memberships.findBySchoolPaginated(schoolId, { statuses: all }, { page: 2, limit: 3 });
      expect(first.items).toHaveLength(3);
      expect(second.items).toHaveLength(1);
      expect(first.totalPages).toBe(2);
      expect([...first.items, ...second.items].map((m) => m.userId)).toEqual([
        ids.admin, ids.carol, ids.bob, ids.alice,
      ]);
    });

    it('filters by role, keeping every role of the members returned', async () => {
      const page = await memberships.findBySchoolPaginated(
        schoolId, { statuses: all, roleId: staffRoleId }, { page: 1, limit: 10 },
      );
      expect(page.total).toBe(1);
      expect(page.items[0].userId).toBe(ids.bob);
      expect([...page.items[0].roleIds].sort()).toEqual([staffRoleId, studentRoleId].sort());
    });

    it('filters by status', async () => {
      const suspended = (await memberships.findBySchoolAndUser(schoolId, ids.carol))!;
      suspended.suspend();
      await memberships.save(suspended);
      const onlySuspended = await memberships.findBySchoolPaginated(
        schoolId, { statuses: [MembershipStatus.SUSPENDED] }, { page: 1, limit: 10 },
      );
      expect(onlySuspended.items.map((m) => m.userId)).toEqual([ids.carol]);
      const active = await memberships.findBySchoolPaginated(
        schoolId, { statuses: [MembershipStatus.ACTIVE] }, { page: 1, limit: 10 },
      );
      expect(active.total).toBe(3);
    });

    it('searches by first name, last name and full name', async () => {
      const byLast = await memberships.findBySchoolPaginated(
        schoolId, { statuses: all, search: 'martin' }, { page: 1, limit: 10 },
      );
      expect(byLast.items.map((m) => m.userId).sort()).toEqual([ids.alice, ids.carol].sort());
      const byFull = await memberships.findBySchoolPaginated(
        schoolId, { statuses: all, search: 'bob durand' }, { page: 1, limit: 10 },
      );
      expect(byFull.items.map((m) => m.userId)).toEqual([ids.bob]);
    });

    it('searches by email only when allowed', async () => {
      const without = await memberships.findBySchoolPaginated(
        schoolId, { statuses: all, search: 'ecole.test' }, { page: 1, limit: 10 },
      );
      expect(without.total).toBe(0);
      const withEmail = await memberships.findBySchoolPaginated(
        schoolId, { statuses: all, search: 'ecole.test', includeEmailInSearch: true }, { page: 1, limit: 10 },
      );
      expect(withEmail.total).toBe(4);
    });

    it('never lists another school', async () => {
      const page = await memberships.findBySchoolPaginated(otherSchoolId, { statuses: all }, { page: 1, limit: 10 });
      expect(page.total).toBe(0);
      expect(page.items).toEqual([]);
    });

    it('lists the active memberships of a user', async () => {
      const active = await memberships.findActiveByUser(ids.bob);
      expect(active.map((m) => m.schoolId)).toEqual([schoolId]);
    });
  });

  describe('invitations', () => {
    it('stores the invited role', async () => {
      const staff = (await roles.findByKey(schoolId, SchoolRoleKey.STAFF))!;
      const { invitation, token } = SchoolInvitation.issue({
        schoolId, email: 'new@ecole.test', roleId: staff.id, invitedBy: ids.admin,
      });
      await invitations.save(invitation);
      const found = await invitations.findByTokenHash(SchoolInvitation.hashToken(token));
      expect(found!.roleId).toBe(staff.id);
      expect((await invitations.findPendingBySchoolAndEmail(schoolId, 'NEW@ecole.test')).length).toBe(1);
    });
  });

  describe('user module: users of a school', () => {
    it('lists the users that belong to the school through school_memberships', async () => {
      const users = new TypeormUserRepository(source.getRepository(UserEntity));
      const page = await users.getAll({ schoolId }, { page: 1, limit: 10 });
      expect(page.items.map((u) => u.email).sort()).toEqual(
        ['ada@ecole.test', 'alice@ecole.test', 'bob@ecole.test', 'carol@ecole.test'].sort(),
      );
    });
  });
});
