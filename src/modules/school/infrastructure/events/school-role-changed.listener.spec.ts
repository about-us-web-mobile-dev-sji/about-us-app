import { afterEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import type { INestApplication } from '@nestjs/common';
import { SchoolRoleChangedListener } from './school-role-changed.listener.js';
import { SchoolRoleChangedEvent } from '../../application/events/school-role-changed.event.js';
import { EventLogService } from '../../../event/application/services/event-log.service.js';

describe('SchoolRoleChangedListener', () => {
  let app: INestApplication;
  afterEach(async () => {
    await app?.close();
  });

  it('records a role definition change in the event log against the school', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [SchoolRoleChangedListener, { provide: EventLogService, useValue: { record } }],
    }).compile();
    app = module.createNestApplication();
    await app.init();

    await app.get(EventEmitter2).emitAsync(
      'school.role.changed',
      new SchoolRoleChangedEvent(
        '11111111-1111-4111-8111-111111111111',
        'École test',
        'role-1',
        'Surveillant',
        'CREATED',
        'admin-1',
        ['VIEW_MEMBERS'],
      ),
    );

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'school.role.changed',
        entityType: 'school',
        entityId: '11111111-1111-4111-8111-111111111111',
        payload: expect.objectContaining({
          roleId: 'role-1',
          roleName: 'Surveillant',
          change: 'CREATED',
          permissions: ['VIEW_MEMBERS'],
          changedBy: 'admin-1',
        }),
      }),
    );
  }, 15_000);
});
