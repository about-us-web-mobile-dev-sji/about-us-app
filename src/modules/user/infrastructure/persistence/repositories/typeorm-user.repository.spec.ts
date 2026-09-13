import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { createTestDatabase } from '../../../../../test/postgres-test-utils.js';
import { TypeormUserRepository } from './typeorm-user.repository.js';
import { UserEntity } from '../entity/user.entity.js';
import { User } from '../../../domain/entities/user.entity.js';
import { SuperAdminEmailConflictException } from '../../../domain/exceptions/super-admin-email-conflict.exception.js';
import { UserEmailAlreadyUsedException } from '../../../domain/exceptions/user-email-already-used.exception.js';
import { TypeormAuthIdentityRepository } from '../../../../auth/infrastructure/persistence/typeorm-auth-identity.repository.js';
import { AuthIdentityEntity } from '../../../../auth/infrastructure/persistence/typeorm/auth-identity.entity.js';
import { AuthSessionEntity } from '../../../../auth/infrastructure/persistence/typeorm/auth-session.entity.js';
import { AuthIdentity } from '../../../../auth/domain/entities/auth-identity.js';
import { AuthProvider } from '../../../../auth/domain/enums/auth-provider.enums.js';
describe.skipIf(!process.env.TEST_DATABASE_URL)(
  'TypeormUserRepository PostgreSQL',
  () => {
    let db: Awaited<ReturnType<typeof createTestDatabase>>;
    let other: DataSource;
    let users: TypeormUserRepository;
    beforeEach(async () => {
      db = await createTestDatabase();
      other = new DataSource({
        type: 'postgres',
        ...db.connection,
        entities: [UserEntity, AuthIdentityEntity, AuthSessionEntity],
      });
      await other.initialize();
      users = new TypeormUserRepository(db.source.getRepository(UserEntity));
    });
    afterEach(async () => {
      if (other?.isInitialized) await other.destroy();
      await db?.cleanup();
    });
    it('matches the ORM schema after synchronization', async () => {
      expect(
        (await db.source.driver.createSchemaBuilder().log()).upQueries,
      ).toEqual([]);
    });
    it.each([false, true])(
      'serializes independent connections (different emails: %s)',
      async (different) => {
        const second = new TypeormUserRepository(
          other.getRepository(UserEntity),
        );
        const [a, b] = await Promise.all([
          users.createInitialSuperAdmin({ email: 'a@example.com' }),
          second.createInitialSuperAdmin({
            email: different ? 'b@example.com' : 'a@example.com',
          }),
        ]);
        expect(a.id).toBe(b.id);
        expect(await db.source.getRepository(UserEntity).count()).toBe(1);
        await other.destroy();
        await other.initialize();
        expect(
          (await second.createInitialSuperAdmin({ email: 'c@example.com' })).id,
        ).toBe(a.id);
      },
    );
    it('never promotes an existing ordinary account', async () => {
      await users.save(User.create({ email: 'a@example.com' }));
      await expect(
        users.createInitialSuperAdmin({ email: 'a@example.com' }),
      ).rejects.toBeInstanceOf(SuperAdminEmailConflictException);
      expect(await users.findSuperAdmin()).toBeNull();
    });
    it('translates concurrent email conflicts into an internal exception', async () => {
      const results = await Promise.allSettled([
        users.save(User.create({ email: 'a@example.com' })),
        users.save(User.create({ email: ' A@EXAMPLE.COM ' })),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.find((result) => result.status === 'rejected'),
      ).toMatchObject({ reason: expect.any(UserEmailAlreadyUsedException) });
    });
    it('creates one identity under concurrency and round-trips millisecond dates', async () => {
      const user = await users.createInitialSuperAdmin({
        email: 'a@example.com',
      });
      const first = new TypeormAuthIdentityRepository(
        db.source.getRepository(AuthIdentityEntity),
      );
      const second = new TypeormAuthIdentityRepository(
        other.getRepository(AuthIdentityEntity),
      );
      const input = AuthIdentity.prepareCreation({
        subjectId: user.id!,
        provider: AuthProvider.EMAIL,
        providerSubject: user.email,
        passwordHash: 'test-hash',
      });
      const [a, b] = await Promise.all([
        first.createIfAbsent(input),
        second.createIfAbsent(input),
      ]);
      expect(a.id).toBe(b.id);
      expect(a.toPrimitives().createdAt.getTime()).toBe(
        input.createdAt.getTime(),
      );
      expect(await db.source.getRepository(AuthIdentityEntity).count()).toBe(1);
    });
  },
);
