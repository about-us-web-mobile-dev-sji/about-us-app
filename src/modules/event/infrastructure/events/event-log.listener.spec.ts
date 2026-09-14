import { describe, expect, it, vi } from 'vitest';
import { EventLogListener } from './event-log.listener.js';
import { EventLogService } from '../../application/usecases/event-log.service.js';
import { SuperAdminCreatedEvent } from '../../../user/domain/events/super-admin-created.event.js';
import { User } from '../../../user/domain/entities/user.entity.js';
import UserStatus from '../../../user/domain/enum/user-status.enum.js';
import { UserStatusUpdatedEvent } from '../../../user/domain/events/user-status-updated.event.js';

describe('EventLogListener', () => {
  it('records the creation of a super admin against the user entity', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const listener = new EventLogListener({ record } as unknown as EventLogService);
    const event = new SuperAdminCreatedEvent(
      '00000000-0000-4000-8000-000000000001',
      'admin@example.com',
    );

    await listener.handleSuperAdminCreated(event);

    expect(record).toHaveBeenCalledWith({
      name: 'super-admin.created',
      entityType: User.ENTITY_TYPE,
      entityId: event.subjectId,
      payload: { email: event.email },
    });
  });

  it('records user status changes against the user entity', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const listener = new EventLogListener({ record } as unknown as EventLogService);
    const event = new UserStatusUpdatedEvent(
      '00000000-0000-4000-8000-000000000001',
      UserStatus.ACTIVE,
      UserStatus.SUSPENDED,
    );

    await listener.handleUserStatusUpdated(event);

    expect(record).toHaveBeenCalledWith({
      name: 'user.status.updated',
      entityType: User.ENTITY_TYPE,
      entityId: event.subjectId,
      payload: { previousStatus: UserStatus.ACTIVE, status: UserStatus.SUSPENDED },
    });
  });
});