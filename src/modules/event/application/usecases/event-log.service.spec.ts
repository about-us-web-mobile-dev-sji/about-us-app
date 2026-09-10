import { describe, expect, it } from 'vitest';
import { EventLogService } from './event-log.service.js';
import { InMemoryEventLogRepository } from '../../infrastructure/persistence/in-memory-event-log.repository.js';

describe('EventLogService', () => {
  it('records an event and finds it by aggregate', async () => {
    const service = new EventLogService(new InMemoryEventLogRepository());

    const eventLog = await service.record({
      name: 'user.status.updated',
      entityType: 'user',
      entityId: '33333333-3333-4333-8333-333333333333',
      actorId: 'admin-1',
      payload: { status: 'suspended' },
    });

    const result = await service.findByAggregate('user', 'user-1');

    expect(result).toEqual([eventLog]);
    expect(eventLog.name).toBe('user.status.updated');
    expect(eventLog.actorId).toBe('admin-1');
    expect(eventLog.payload).toEqual({ status: 'suspended' });
  });

  it('rejects an event without a name', async () => {
    const service = new EventLogService(new InMemoryEventLogRepository());

    await expect(
      service.record({
        name: ' ',
        entityType: 'user',
        entityId: '33333333-3333-4333-8333-333333333333',
      }),
    ).rejects.toThrow('Event name is required');
  });
});