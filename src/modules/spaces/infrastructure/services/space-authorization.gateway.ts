import { SpaceAuthorizationGateway } from '../../application/ports/space-authorization.gateway.js';
import { CanManageUseCase } from '../../application/use-cases/queries/can-manage/can-manage.js';
import type { UUID } from 'node:crypto';

export class SpaceAuthorizationGatewayImpl implements SpaceAuthorizationGateway {
  constructor(private readonly canManage: CanManageUseCase) {}

  async canManageSpace(actorId: UUID, spaceId: UUID): Promise<boolean> {
    const result = await this.canManage.handle(actorId, spaceId);
    return result.canManage;
  }

  async canManageSpaceOrThrow(actorId: UUID, spaceId: UUID): Promise<void> {
    const result = await this.canManage.handle(actorId, spaceId);
    if (!result.canManage) {
      throw new Error('User cannot manage this space');
    }
  }
}