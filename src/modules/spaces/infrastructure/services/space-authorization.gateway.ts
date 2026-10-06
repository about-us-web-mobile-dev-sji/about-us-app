import { SpaceAuthorizationGateway } from '../../application/ports/space-authorization.gateway.js';
import { CanManageUseCase } from '../../application/use-cases/queries/can-manage/can-manage.js';
import { UserAccountService } from '../../../user/application/user-account.service.js';
import { GlobalRole } from '../../../user/domain/enum/global-role.enum.js';
import type { UUID } from 'node:crypto';

export class SpaceAuthorizationGatewayImpl implements SpaceAuthorizationGateway {
  constructor(
    private readonly canManage: CanManageUseCase,
    private readonly users: UserAccountService,
  ) {}

  async canManageSpace(actorId: UUID, spaceId: UUID): Promise<boolean> {
    if (await this.isSuperAdmin(actorId)) {
      return true;
    }
    const result = await this.canManage.handle(actorId, spaceId);
    return result.canManage;
  }

  async canManageSpaceOrThrow(actorId: UUID, spaceId: UUID): Promise<void> {
    if (await this.isSuperAdmin(actorId)) {
      return;
    }
    const result = await this.canManage.handle(actorId, spaceId);
    if (!result.canManage) {
      throw new Error('User cannot manage this space');
    }
  }

  private async isSuperAdmin(actorId: UUID): Promise<boolean> {
    const profile = await this.users.authenticationProfile(actorId);
    return profile?.globalRole === GlobalRole.SUPER_ADMIN;
  }
}
