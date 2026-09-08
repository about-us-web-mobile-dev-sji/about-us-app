import type {
  SuperAdminEventsGateway,
  SuperAdminCreatedHandler,
} from '../../application/gateways/i-super-admin-events.gateway.js';
import type { SuperAdminCreatedEvent } from '../../domain/events/super-admin-created.event.js';

/** Awaited in-process delivery: listener errors must fail bootstrap. */
export class InMemorySuperAdminEventsGateway implements SuperAdminEventsGateway {
  private readonly handlers = new Set<SuperAdminCreatedHandler>();
  subscribe(handler: SuperAdminCreatedHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  async publish(event: SuperAdminCreatedEvent): Promise<void> {
    if (!this.handlers.size)
      throw new Error('No subscriber for SuperAdminCreatedEvent');
    for (const handler of this.handlers) await handler(event);
  }
}
