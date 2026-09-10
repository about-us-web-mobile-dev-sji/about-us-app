import { afterEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { SuperAdminCreatedListener } from './super-admin-created.listener.js';
import { CreateSuperAdminIdentityUseCase } from '../../application/use-cases/commands/create-super-admin-identity/CreateSuperAdminIdentity.js';
import { UserAccountService } from '../../../user/application/user-account.service.js';
import { NestSuperAdminEventsGateway } from '../../../user/infrastructure/events/nest-super-admin-events.gateway.js';
import { SuperAdminCreatedEvent } from '../../../user/domain/events/super-admin-created.event.js';
describe('SuperAdminCreatedListener event integration', () => {
  let app: INestApplication;
  afterEach(async () => {
    await app?.close();
  });
  it('propagates identity failures through the Nest bus and supports redelivery', async () => {
    const handle = vi
      .fn()
      .mockRejectedValueOnce(new Error('Identity persistence failed'))
      .mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        SuperAdminCreatedListener,
        { provide: CreateSuperAdminIdentityUseCase, useValue: { handle } },
        { provide: ConfigService, useValue: { get: () => 'test-password' } },
        {
          provide: UserAccountService,
          useValue: { requiresPasswordAuthentication: async () => true },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    const publisher = new NestSuperAdminEventsGateway(app.get(EventEmitter2));
    const event = new SuperAdminCreatedEvent(
      '00000000-0000-4000-8000-000000000001',
      'admin@example.com',
    );
    await expect(publisher.publish(event)).rejects.toThrow(
      'Identity persistence failed',
    );
    await expect(publisher.publish(event)).resolves.toBeUndefined();
    expect(handle).toHaveBeenCalledTimes(2);
    expect(event).not.toHaveProperty('password');
  });
});
