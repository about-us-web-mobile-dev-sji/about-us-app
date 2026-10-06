import type { SuperAdminCreatedEvent } from '../../domain/events/super-admin-created.event.js';
export const SUPER_ADMIN_EVENTS = Symbol('SUPER_ADMIN_EVENTS');
export interface SuperAdminEventsGateway {
  publish(event: SuperAdminCreatedEvent): Promise<void>;
}
