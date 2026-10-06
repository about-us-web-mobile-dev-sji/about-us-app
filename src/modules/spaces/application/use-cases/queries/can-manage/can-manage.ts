import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceMembershipRepository } from '../../../../domain/repositories/i-space-membership.repository.js';
import type { UUID } from 'node:crypto';

export interface CanManageOutput {
  canManage: boolean;
  managingSpaceIds: UUID[];
  targetSpaceId: UUID;
}

export class CanManageUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly memberships: SpaceMembershipRepository,
  ) {}

  async handle(userId: UUID, targetSpaceId: UUID): Promise<CanManageOutput> {
    // 1. Vérifier que l'espace cible existe
    const targetSpace = await this.spaces.findById(targetSpaceId);
    if (!targetSpace) {
      return {
        canManage: false,
        managingSpaceIds: [],
        targetSpaceId,
      };
    }

    // 2. Trouver toutes les memberships MANAGER actives de l'utilisateur
    const managerMemberships = await this.memberships.findManagerMembershipsForUser(userId);

    if (managerMemberships.length === 0) {
      return {
        canManage: false,
        managingSpaceIds: [],
        targetSpaceId,
      };
    }

    // 3. Pour chaque espace géré directement, vérifier si le path est préfixe du path cible
    const targetPath = targetSpace.path.value;
    const managingSpaceIds: UUID[] = [];

    for (const membership of managerMemberships) {
      const managedSpace = await this.spaces.findById(membership.spaceId);
      if (!managedSpace) continue;

      // Vérifier si managedSpace.path est préfixe hiérarchique de targetPath
      if (targetPath === managedSpace.path.value || targetPath.startsWith(managedSpace.path.value + '/')) {
        managingSpaceIds.push(membership.spaceId);
      }
    }

    return {
      canManage: managingSpaceIds.length > 0,
      managingSpaceIds,
      targetSpaceId,
    };
  }
}