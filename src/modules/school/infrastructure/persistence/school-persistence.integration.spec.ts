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
import { TypeormSchoolMembershipRepository } from './typeorm-school-membership.repository.js';
import { TypeormSchoolInvitationRepository } from './typeorm-school-invitation.repository.js';
import { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import { SchoolInvitation } from '../../domain/entities/school-invitation.entity.js';
import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { SchoolRole } from '../../domain/enums/school-role.enum.js';

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
        SchoolEntity, SchoolMembershipEntity, SchoolInvitationEntity,
      ],
    });
    await source.initialize();
    for (const schema of ['auth', '"user"', 'school']) {
      await source.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    }
    await source.synchronize();

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

  describe('memberships', () => {
    beforeAll(async () => {
      const make = (userId: string, role: SchoolRole, grantedAtOffset: number) => {
        const m = SchoolMembership.create({ schoolId, userId, role, grantedBy: ids.admin });
        return SchoolMembership.reconstitute({
          ...m.toPrimitives(),
          grantedAt: new Date(Date.now() - grantedAtOffset),
        });
      };
      await memberships.save(make(ids.carol, SchoolRole.MEMBER, 5000));
      await memberships.save(make(ids.bob, SchoolRole.MEMBER, 4000));
      await memberships.save(make(ids.alice, SchoolRole.MEMBER, 3000));
      await memberships.save(make(ids.admin, SchoolRole.ADMIN, 1000)); // newest, but administrator
    });

    it('stores and reloads the role of a membership', async () => {
      expect((await memberships.findBySchoolAndUser(schoolId, ids.bob))!.role).toBe(SchoolRole.MEMBER);
      expect((await memberships.findBySchoolAndUser(schoolId, ids.admin))!.role).toBe(SchoolRole.ADMIN);
    });

    it('updates the role of a membership', async () => {
      const alice = (await memberships.findBySchoolAndUser(schoolId, ids.alice))!;
      alice.changeRole(SchoolRole.ADMIN);
      await memberships.save(alice);
      expect((await memberships.findBySchoolAndUser(schoolId, ids.alice))!.isAdmin).toBe(true);
      const reloaded = (await memberships.findBySchoolAndUser(schoolId, ids.alice))!;
      reloaded.changeRole(SchoolRole.MEMBER);
      await memberships.save(reloaded);
      expect((await memberships.findBySchoolAndUser(schoolId, ids.alice))!.role).toBe(SchoolRole.MEMBER);
    });

    const all = [MembershipStatus.ACTIVE, MembershipStatus.SUSPENDED, MembershipStatus.INACTIVE];

    it('lists the administrator first, then the oldest, with a correct total', async () => {
      const page = await memberships.findBySchoolPaginated(schoolId, { statuses: all }, { page: 1, limit: 10 });
      expect(page.total).toBe(4);
      expect(page.items.map((m) => m.userId)).toEqual([ids.admin, ids.carol, ids.bob, ids.alice]);
      expect(page.items[0].role).toBe(SchoolRole.ADMIN);
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

    it('filters by role', async () => {
      const page = await memberships.findBySchoolPaginated(
        schoolId, { statuses: all, role: SchoolRole.ADMIN }, { page: 1, limit: 10 },
      );
      expect(page.total).toBe(1);
      expect(page.items[0].userId).toBe(ids.admin);
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
      const { invitation, token } = SchoolInvitation.issue({
        schoolId, email: 'new@ecole.test', role: SchoolRole.ADMIN, invitedBy: ids.admin,
      });
      await invitations.save(invitation);
      const found = await invitations.findByTokenHash(SchoolInvitation.hashToken(token));
      expect(found!.role).toBe(SchoolRole.ADMIN);
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
