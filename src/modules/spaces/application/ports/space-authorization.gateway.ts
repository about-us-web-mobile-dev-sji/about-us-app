import type { UUID } from 'node:crypto';

export interface SpaceAuthorizationGateway {
  canManageSpace(actorId: UUID, spaceId: UUID): Promise<boolean>;
  canManageSpaceOrThrow(actorId: UUID, spaceId: UUID): Promise<void>;
}

export const SPACE_AUTHORIZATION_GATEWAY = Symbol('SPACE_AUTHORIZATION_GATEWAY');