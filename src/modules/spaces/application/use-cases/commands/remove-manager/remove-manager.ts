import { SpaceMembership } from '../../../../domain/entities/space-membership.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceMembershipRepository } from '../../../../domain/repositories/i-space-membership.repository.js';
import type { SpaceAuthorizationGateway } from '../../../ports/space-authorization.gateway.js';
import type { RemoveManagerInput, RemoveManagerOutput } from '../../../dto/space-membership.dto.js';
import { SpaceNotFoundException, SpaceManagerNotFoundException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class RemoveManagerUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly memberships: SpaceMembershipRepository,
    private readonly auth: SpaceAuthorizationGateway,
  ) {}

  async handle(input: RemoveManagerInput): Promise<RemoveManagerOutput> {
    // 1. Vérifier que l'espace existe
    const space = await this.spaces.findByIdOrThrow(input.spaceId);

    // 2. Vérifier les droits de l'acteur
    await this.auth.canManageSpaceOrThrow(input.actorId, space.id!);

    // 3. Trouver le manager direct
    const manager = await this.memberships.findDirectManager(space.id!);
    if (!manager) {
      throw new SpaceManagerNotFoundException(space.id!);
    }

    // 4. Retirer le manager (soft delete)
    manager.remove(input.actorId);
    const saved = await this.memberships.save(manager);

    return this.toOutput(saved);
  }

  private toOutput(membership: SpaceMembership): RemoveManagerOutput {
    const p = membership.toPrimitives();
    return {
      id: p.id!,
      spaceId: p.spaceId,
      userId: p.userId,
      status: p.status,
      revokedAt: p.revokedAt!,
      revokedBy: p.revokedBy!,
    };
  }
}