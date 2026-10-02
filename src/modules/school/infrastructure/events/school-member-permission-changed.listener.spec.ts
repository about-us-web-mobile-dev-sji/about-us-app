import { afterEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import type { INestApplication } from '@nestjs/common';
import { SchoolMemberPermissionChangedListener } from './school-member-permission-changed.listener.js';
import { SchoolMemberPermissionChangedEvent } from './school-member-permission-changed.event.js';
import { EventLogService } from '../../../event/application/services/event-log.service.js';

describe('SchoolMemberPermissionChangedListener', () => {
  let app: INestApplication;
  afterEach(async () => {
    await app?.close();
  });

  it.each([
    ['school.member-permission.granted', 'GRANTED'],
    ['school.member-permission.revoked', 'REVOKED'],
  ] as const)('records %s in the event log against the school', async (name, change) => {
    const record = vi.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [SchoolMemberPermissionChangedListener, { provide: EventLogService, useValue: { record } }],
    }).compile();
    app = module.createNestApplication();
    await app.init();

    await app.get(EventEmitter2).emitAsync(
      name,
      new SchoolMemberPermissionChangedEvent(
        '11111111-1111-4111-8111-111111111111',
        'École test',
        'member-1',
        'SUSPEND_MEMBER',
        change,
        'admin-1',
      ),
    );

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        name,
        entityType: 'school',
        entityId: '11111111-1111-4111-8111-111111111111',
        payload: expect.objectContaining({
          memberUserId: 'member-1',
          action: 'SUSPEND_MEMBER',
          change,
          grantedBy: 'admin-1',
        }),
      }),
    );
  }, 15_000);
});
