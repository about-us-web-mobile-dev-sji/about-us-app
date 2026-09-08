import { afterEach, describe, expect, it, vi } from 'vitest';
import { SqliteDatabase } from '../../../../../shared/infrastructure/database/sqlite.database.js';
import { CreateSuperAdminUseCase } from './create-super-admin.usecase.js';
import { PUserRepository } from '../../../infrastructure/persistence/repositories/p-user.repository.js';
import { InMemorySuperAdminEventsGateway } from '../../../infrastructure/events/in-memory-super-admin-events.gateway.js';
import { SuperAdminCreatedEvent } from '../../../domain/events/super-admin-created.event.js';

const databases: SqliteDatabase[] = [];
afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

function setup() {
  const database = new SqliteDatabase(':memory:');
  databases.push(database);
  const users = new PUserRepository(database);
  const events = new InMemorySuperAdminEventsGateway();
  const useCase = new CreateSuperAdminUseCase(
    { email: ' Admin@Example.com ', firstName: 'Admin' },
    users,
    events,
  );
  return { users, events, useCase };
}

describe('CreateSuperAdminUseCase', () => {
  it('publishes the persisted identifier and email without credentials and awaits its listener', async () => {
    const { users, events, useCase } = setup();
    let finish!: () => void;
    const waiting = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const listener = vi.fn(async (event: SuperAdminCreatedEvent) => {
      expect((await users.findById(event.subjectId))?.email).toBe(
        'admin@example.com',
      );
      expect(Object.keys(event).sort()).toEqual(['email', 'subjectId']);
      await waiting;
    });
    events.subscribe(listener);
    let completed = false;
    const task = useCase.handle().then(() => {
      completed = true;
    });
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    expect(completed).toBe(false);
    finish();
    await task;
    expect(completed).toBe(true);
  });

  it('propagates listener failures and retries with the same saved user', async () => {
    const { users, events, useCase } = setup();
    const listener = vi
      .fn()
      .mockRejectedValueOnce(new Error('Auth unavailable'))
      .mockResolvedValue(undefined);
    events.subscribe(listener);
    await expect(useCase.handle()).rejects.toThrow('Auth unavailable');
    const user = (await users.findByEmail('admin@example.com'))!;
    await useCase.handle();
    expect(listener.mock.calls[1][0].subjectId).toBe(user.id);
    expect((await users.findByEmail('admin@example.com'))?.id).toBe(user.id);
  });

  it('fails instead of reporting success when no Auth listener is registered', async () => {
    await expect(setup().useCase.handle()).rejects.toThrow('No subscriber');
  });
});
