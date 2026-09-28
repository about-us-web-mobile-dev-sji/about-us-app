import { SpaceMembership } from '../../../../domain/entities/space-membership.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceMembershipRepository } from '../../../../domain/repositories/i-space-membership.repository.js';
import type { SpaceAuthorizationGateway } from '../../../ports/space-authorization.gateway.js';
import type { RemoveMemberInput, RemoveMemberOutput } from '../../../dto/space-membership.dto.js';
import { SpaceNotFoundException, SpaceMemberNotFoundException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class RemoveMemberUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly memberships: SpaceMembershipRepository,
    private readonly auth: SpaceAuthorizationGateway,
  ) {}

  async handle(input: RemoveMemberInput): Promise<RemoveMemberOutput> {
    // 1. Vérifier que l'espace existe
    const space = await this.spaces.findByIdOrThrow(input.spaceId);

    // 2. Vérifier les droits de l'acteur
    await this.auth.canManageSpaceOrThrow(input.actorId, space.id!);

    // 3. Trouver la membership
    const membership = await this.memberships.findBySpaceAndUser(space.id!, input.userId);
    if (!membership || !membership.isActive()) {
      throw new SpaceMemberNotFoundException(input.userId, space.id!);
    }

    // 4. Si c'est le manager direct, on ne peut pas le supprimer simplement
    // Il faut d'abord le remplacer (use case AssignManager) ou utiliser RemoveManager
    if (membership.isManager()) {
      throw new Error('Cannot remove direct manager. Use removeManager use case or assign a new manager first.');
    }

    // 5. Supprimer (soft delete)
    membership.remove(input.actorId);
    const saved = await this.memberships.save(membership);

    return this.toOutput(saved);
  }

  private toOutput(membership: SpaceMembership): RemoveMemberOutput {
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