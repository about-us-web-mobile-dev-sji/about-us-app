import { SpaceMembership } from '../../../../domain/entities/space-membership.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceMembershipRepository } from '../../../../domain/repositories/i-space-membership.repository.js';
import type { SpaceAuthorizationGateway } from '../../../ports/space-authorization.gateway.js';
import type { AddMemberInput, AddMemberOutput } from '../../../dto/space-membership.dto.js';
import { SpaceNotFoundException, SpaceMemberAlreadyExistsException, SpaceManagerAlreadyAssignedException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class AddMemberUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly memberships: SpaceMembershipRepository,
    private readonly auth: SpaceAuthorizationGateway,
  ) {}

  async handle(input: AddMemberInput): Promise<AddMemberOutput> {
    // 1. Vérifier que l'espace existe
    const space = await this.spaces.findByIdOrThrow(input.spaceId);

    // 2. Vérifier les droits de l'acteur sur l'espace
    await this.auth.canManageSpaceOrThrow(input.actorId, space.id!);

    // 3. Vérifier si l'utilisateur est déjà membre
    const existing = await this.memberships.findBySpaceAndUser(space.id!, input.userId);
    if (existing && existing.isActive()) {
      throw new SpaceMemberAlreadyExistsException(input.userId, space.id!);
    }

    // 4. Si c'est un manager, vérifier l'unicité
    if (input.role === 'MANAGER') {
      const currentManager = await this.memberships.findDirectManager(space.id!);
      if (currentManager) {
        throw new SpaceManagerAlreadyAssignedException(space.id!);
      }
    }

    // 5. Si membership existe mais est REMOVED, le réactiver
    if (existing && existing.isRemoved()) {
      existing.reactivate(input.actorId);
      existing.promoteToManager(); // If role is MANAGER
      const saved = await this.memberships.save(existing);
      return this.toOutput(saved);
    }

    // 6. Créer la nouvelle membership
    const membership = SpaceMembership.create({
      spaceId: space.id!,
      userId: input.userId,
      role: input.role,
      grantedBy: input.actorId,
    });

    const saved = await this.memberships.save(membership);
    return this.toOutput(saved);
  }

  private toOutput(membership: SpaceMembership): AddMemberOutput {
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