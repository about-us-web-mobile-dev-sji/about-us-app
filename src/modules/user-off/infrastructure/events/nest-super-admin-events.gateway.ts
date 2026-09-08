import { EventEmitter2 } from '@nestjs/event-emitter';
import type { SuperAdminEventsGateway } from '../../application/gateway/super-admin-events.gateway.js';
import type { SuperAdminCreatedEvent } from '../../domain/events/super-admin-created.event.js';
export class NestSuperAdminEventsGateway implements SuperAdminEventsGateway {
  constructor(private readonly emitter: EventEmitter2) {}
  async publish(event: SuperAdminCreatedEvent): Promise<void> {
    await this.emitter.emitAsync('super-admin.created', event);
  }
}
