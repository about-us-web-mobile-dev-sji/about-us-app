import { SpaceMembership } from '../../../../domain/entities/space-membership.js';
import { SpaceMembershipRole } from '../../../../domain/enums/space-membership-role.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceMembershipRepository } from '../../../../domain/repositories/i-space-membership.repository.js';
import type { SpaceAuthorizationGateway } from '../../../ports/space-authorization.gateway.js';
import type { AssignManagerInput, AssignManagerOutput } from '../../../dto/space-membership.dto.js';
import { SpaceNotFoundException, SpaceMemberNotFoundException, SpaceManagerAlreadyAssignedException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class AssignManagerUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly memberships: SpaceMembershipRepository,
    private readonly auth: SpaceAuthorizationGateway,
  ) {}

  async handle(input: AssignManagerInput): Promise<AssignManagerOutput> {
    // 1. Vérifier que l'espace existe
    const space = await this.spaces.findByIdOrThrow(input.spaceId);

    // 2. Vérifier les droits de l'acteur
    await this.auth.canManageSpaceOrThrow(input.actorId, space.id!);

    // 3. Vérifier s'il y a déjà un manager direct
    const currentManager = await this.memberships.findDirectManager(space.id!);
    if (currentManager) {
      throw new SpaceManagerAlreadyAssignedException(space.id!);
    }

    // 4. Trouver ou créer la membership
    let membership = await this.memberships.findBySpaceAndUser(space.id!, input.userId);

    if (membership) {
      if (!membership.isActive()) {
        // Réactiver et promouvoir
        membership.reactivate(input.actorId);
        membership.promoteToManager();
      } else if (membership.isMember()) {
        // Promouvoir
        membership.promoteToManager();
      } else {
        // Déjà manager (ne devrait pas arriver vu la vérification ci-dessus)
        throw new SpaceManagerAlreadyAssignedException(space.id!);
      }
    } else {
      // Créer nouvelle membership MANAGER
      membership = SpaceMembership.create({
        spaceId: space.id!,
        userId: input.userId,
        role: SpaceMembershipRole.MANAGER,
        grantedBy: input.actorId,
      });
    }

    const saved = await this.memberships.save(membership);
    return this.toOutput(saved);
  }

  private toOutput(membership: SpaceMembership): AssignManagerOutput {
    const p = membership.toPrimitives();
    return {
      id: p.id!,
      spaceId: p.spaceId,
      userId: p.userId,
      role: p.role,
      status: p.status,
      grantedBy: p.grantedBy,
      grantedAt: p.grantedAt,
    };
  }
}