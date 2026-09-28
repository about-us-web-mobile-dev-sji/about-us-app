import { SpaceMembership } from '../../../../domain/entities/space-membership.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceMembershipRepository } from '../../../../domain/repositories/i-space-membership.repository.js';
import type { GetMembersInput, GetMembersOutput, GetMembersOutputItem } from '../../../dto/space-membership.dto.js';
import { SpaceNotFoundException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class GetMembersUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly memberships: SpaceMembershipRepository,
  ) {}

  async handle(input: GetMembersInput): Promise<GetMembersOutput> {
    // 1. Vérifier que l'espace existe
    const space = await this.spaces.findByIdOrThrow(input.spaceId);

    // 2. Récupérer les membres
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const members = await this.memberships.findMembers(space.id!, {
      status: input.status,
      role: input.role,
    });

    // Pagination manuelle (le repository n'a pas de pagination pour findMembers)
    const start = (page - 1) * limit;
    const paginated = members.slice(start, start + limit);

    return {
      items: paginated.map(this.toOutput),
      total: members.length,
      page,
      limit,
      totalPages: Math.ceil(members.length / limit),
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