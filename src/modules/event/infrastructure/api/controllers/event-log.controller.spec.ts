import { describe, expect, it, vi } from 'vitest';
import { EventLog } from '../../../domain/entities/event-log.js';
import { EventLogController } from './event-log.controller.js';
import { EventLogService } from '../../../application/services/event-log.service.js';
import { ListEventLogs } from '../../../application/usecases/queries/list-event-log/list-event-logs.js';
import { GetEventLog } from '../../../application/usecases/command/get-event-log/get-event-log.js';

describe('EventLogController', () => {
  it('returns logs for an aggregate as JSON-safe objects', async () => {
    const eventLog = EventLog.create({
      name: 'user.status.updated',
      message: "Le statut de l'utilisateur a été mis à jour.",
      entityType: 'user',
      entityId: '33333333-3333-4333-8333-333333333333',
      payload: { status: 'suspended' },
    });
    const findByAggregate = vi.fn().mockResolvedValue([eventLog]);
    const controller = new EventLogController(
      {} as ListEventLogs,
      {} as GetEventLog,
      { findByAggregate } as unknown as EventLogService,
    );

    const result = await controller.findByAggregate(
      'user',
      '33333333-3333-4333-8333-333333333333',
    );

    expect(findByAggregate).toHaveBeenCalledWith(
      'user',
      '33333333-3333-4333-8333-333333333333',
    );
    expect(result).toEqual([
      {
        id: eventLog.id,
        name: 'user.status.updated',
        message: "Le statut de l'utilisateur a été mis à jour.",
        entityType: 'user',
        entityId: '33333333-3333-4333-8333-333333333333',
        actorId: null,
        payload: { status: 'suspended' },
        occurredAt: eventLog.occurredAt,
      },
    ]);
  });
});