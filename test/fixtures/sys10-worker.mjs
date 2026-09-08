import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const [compiled, databasePath, bcryptUrl, number] = process.argv.slice(2);
const load = (path) => import(pathToFileURL(join(compiled, path)).href);
const { SqliteDatabase } = await load(
  'shared/infrastructure/database/sqlite.database.js',
);
const { PUserRepository } = await load(
  'modules/user/infrastructure/persistence/repositories/p-user.repository.js',
);
const { SqliteAuthIdentityRepository } = await load(
  'modules/auth/infrastructure/persistence/sqlite-auth-identity.repository.js',
);
const { CreateSuperAdminUseCase } = await load(
  'modules/user/application/use-cases/create-super-admin/create-super-admin.usecase.js',
);
const { CreateSuperAdminIdentityUseCase } = await load(
  'modules/auth/application/use-cases/create-super-admin-identity.usecase.js',
);
const { InMemorySuperAdminEventsGateway } = await load(
  'modules/user/infrastructure/events/in-memory-super-admin-events.gateway.js',
);
const { default: bcrypt } = await import(bcryptUrl);
const database = new SqliteDatabase(databasePath);
const users = new PUserRepository(database);
const identities = new SqliteAuthIdentityRepository(database);
const events = new InMemorySuperAdminEventsGateway();
const createIdentity = new CreateSuperAdminIdentityUseCase(identities, {
  encrypt: (password) => bcrypt.hash(password, 10),
  compare: bcrypt.compare,
});
events.subscribe((event) =>
  createIdentity.handle({
    subjectId: event.subjectId,
    email: event.email,
    password: 'Concurrent-password!',
  }),
);
const bootstrap = new CreateSuperAdminUseCase(
  { email: `admin-${number}@example.com` },
  users,
  events,
);
process.once('message', async () => {
  try {
    await bootstrap.handle();
    const admin = await users.findSuperAdmin();
    const identity = await identities.findBySubjectAndProvider(
      admin.id,
      'EMAIL',
    );
    process.send({
      type: 'result',
      userId: admin.id,
      identityId: identity.id,
      hash: identity.toPrimitives().passwordHash,
    });
  } catch (error) {
    process.send({ type: 'failure', message: error.message });
    process.exitCode = 1;
  } finally {
    database.close();
    process.disconnect();
  }
});
process.send({ type: 'ready' });
