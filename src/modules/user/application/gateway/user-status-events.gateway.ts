import type { UserStatusUpdatedEvent } from '../../domain/events/user-status-updated.event.js';

export const USER_STATUS_EVENTS = Symbol('USER_STATUS_EVENTS');

export interface UserStatusEventsGateway {
  publish(event: UserStatusUpdatedEvent): Promise<void>;
}