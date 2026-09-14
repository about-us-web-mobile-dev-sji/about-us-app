import { afterEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import type { INestApplication } from '@nestjs/common';
import { InvitationAcceptedListener } from './invitation-accepted.listener.js';
import { EventLogService } from './application/usecases/event-log.service.js';
import { InvitationAcceptedEvent } from './invitation-accepted.event.js';

describe('InvitationAcceptedListener', () => {
  let app: INestApplication;
  afterEach(async () => {
    await app?.close();
  });

  it('records the event when an invitation is accepted', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        InvitationAcceptedListener,
        { provide: EventLogService, useValue: { record } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();

    const emitter = app.get(EventEmitter2);
    await emitter.emitAsync(
      'invitation.accepted',
      new InvitationAcceptedEvent(
        'a-inviter-id',
        '11111111-1111-4111-8111-111111111111',
        'École test',
        '22222222-2222-4222-8222-222222222222',
        new Date('2026-09-12T10:00:00.000Z'),
      ),
    );

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'invitation.accepted',
        entityType: 'school',
        entityId: '11111111-1111-4111-8111-111111111111',
      }),
    );
  });
});