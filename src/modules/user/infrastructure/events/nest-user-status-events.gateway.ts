import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UserStatusEventsGateway } from '../../application/gateway/user-status-events.gateway.js';
import type { UserStatusUpdatedEvent } from '../../domain/events/user-status-updated.event.js';

export class NestUserStatusEventsGateway implements UserStatusEventsGateway {
  constructor(private readonly emitter: EventEmitter2) {}

  async publish(event: UserStatusUpdatedEvent): Promise<void> {
    await this.emitter.emitAsync('user.status.updated', event);
  }
}