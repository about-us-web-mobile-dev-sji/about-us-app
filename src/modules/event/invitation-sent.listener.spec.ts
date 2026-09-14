import { afterEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import type { INestApplication } from '@nestjs/common';
import { InvitationSentListener } from './invitation-sent.listener.js';
import { EventLogService } from './application/usecases/event-log.service.js';
import { InvitationSentEvent } from './invitation-sent.event.js';

describe('InvitationSentListener', () => {
  let app: INestApplication;
  afterEach(async () => {
    await app?.close();
  });

  it('records the event when an invitation is sent', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        InvitationSentListener,
        { provide: EventLogService, useValue: { record } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();

    const emitter = app.get(EventEmitter2);
    await emitter.emitAsync(
      'invitation.sent',
      new InvitationSentEvent(
        'admin@ecole.test',
        '11111111-1111-4111-8111-111111111111',
        'École test',
        new Date('2026-09-12T10:00:00.000Z'),
      ),
    );

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'invitation.sent',
        entityType: 'school',
        entityId: '11111111-1111-4111-8111-111111111111',
      }),
    );
  });
});