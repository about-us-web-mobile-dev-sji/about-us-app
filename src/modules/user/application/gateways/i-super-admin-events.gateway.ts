import type { SuperAdminCreatedEvent } from '../../domain/events/super-admin-created.event.js';
export const SUPER_ADMIN_EVENTS = Symbol('SUPER_ADMIN_EVENTS');
export type SuperAdminCreatedHandler = (
  event: SuperAdminCreatedEvent,
) => Promise<void>;
export interface SuperAdminEventsGateway {
  publish(event: SuperAdminCreatedEvent): Promise<void>;
  subscribe(handler: SuperAdminCreatedHandler): () => void;
}
