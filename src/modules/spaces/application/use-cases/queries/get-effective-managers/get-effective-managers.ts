import { SpaceMembership } from '../../../../domain/entities/space-membership.js';
import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceMembershipRepository } from '../../../../domain/repositories/i-space-membership.repository.js';
import type { GetEffectiveManagersInput, GetEffectiveManagersOutput, GetMembersOutputItem } from '../../../dto/space-membership.dto.js';
import { SpaceNotFoundException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class GetEffectiveManagersUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly memberships: SpaceMembershipRepository,
  ) {}

  async handle(input: GetEffectiveManagersInput): Promise<GetEffectiveManagersOutput> {
    // 1. Vérifier que l'espace existe
    const space = await this.spaces.findByIdOrThrow(input.spaceId);

    // 2. Manager direct
    const directManager = await this.memberships.findDirectManager(space.id!);

    // 3. Managers hérités (ancêtres qui ont un manager)
    const inheritedManagers: GetMembersOutputItem[] = [];
    let currentAncestor: Space | null = space;
    
    while ((currentAncestor = currentAncestor.path.getAncestorPath() ? 
      await this.spaces.findById(currentAncestor.path.getAncestorPath()!.getLastSegment() as UUID) : 
      null)) {
      // Get the ancestor space by its ID (last segment of ancestor path)
      const ancestorPath = currentAncestor.path.getAncestorPath();
      if (!ancestorPath) break;
      
      const ancestorSpace = await this.spaces.findById(ancestorPath.getLastSegment() as UUID);
      if (!ancestorSpace) break;
      
      const ancestorManager = await this.memberships.findDirectManager(ancestorSpace.id!);
      if (ancestorManager) {
        inheritedManagers.push(this.toOutput(ancestorManager));
      }
    }

    // Actually, let's do this more efficiently by walking up the path
    // Get all ancestors and check each for direct manager
    const pathParts = space.path.value.split('/').filter(Boolean);
    // Remove the last part (the space itself)
    pathParts.pop();
    
    for (const ancestorId of pathParts.reverse()) { // From root to parent
      const ancestorManager = await this.memberships.findDirectManager(ancestorId as UUID);
      if (ancestorManager) {
        inheritedManagers.push(this.toOutput(ancestorManager));
      }
    }

    return {
      spaceId: space.id!,
      directManager: directManager ? this.toOutput(directManager) : null,
      inheritedManagers,
    };
  }

  private toOutput(membership: SpaceMembership): GetMembersOutputItem {
    const p = membership.toPrimitives();
    return {
      id: p.id!,
      spaceId: p.spaceId,
      userId: p.userId,
      role: p.role,
      status: p.status,
      grantedBy: p.grantedBy,
      grantedAt: p.grantedAt,
      revokedAt: p.revokedAt,
      revokedBy: p.revokedBy,
    };
  }
}