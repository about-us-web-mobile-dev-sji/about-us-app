import { afterEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import type { INestApplication } from '@nestjs/common';
import { SchoolMemberRoleChangedListener } from './school-member-role-changed.listener.js';
import { SchoolMemberRoleChangedEvent } from '../../application/events/school-member-role-changed.event.js';
import { EventLogService } from '../../../event/application/services/event-log.service.js';

describe('SchoolMemberRoleChangedListener', () => {
  let app: INestApplication;
  afterEach(async () => {
    await app?.close();
  });

  it('records a role change in the event log against the school', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [SchoolMemberRoleChangedListener, { provide: EventLogService, useValue: { record } }],
    }).compile();
    app = module.createNestApplication();
    await app.init();

    await app.get(EventEmitter2).emitAsync(
      'school.member-role.changed',
      new SchoolMemberRoleChangedEvent(
        '11111111-1111-4111-8111-111111111111',
        'École test',
        'member-1',
        'role-1',
        'Personnel',
        'ASSIGNED',
        'root',
      ),
    );

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'school.member-role.changed',
        entityType: 'school',
        entityId: '11111111-1111-4111-8111-111111111111',
        payload: expect.objectContaining({
          memberUserId: 'member-1',
          roleId: 'role-1',
          roleName: 'Personnel',
          change: 'ASSIGNED',
          changedBy: 'root',
        }),
      }),
    );
  }, 15_000);
});
