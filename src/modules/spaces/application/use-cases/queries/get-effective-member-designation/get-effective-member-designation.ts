import { Space } from '../../../../domain/entities/space.js';
import { MemberDesignation } from '../../../../domain/value-objects/member-designation.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { GetEffectiveMemberDesignationInput, GetEffectiveMemberDesignationOutput } from '../../../dto/space-designation.dto.js';
import { SpaceNotFoundException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class GetEffectiveMemberDesignationUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async handle(input: GetEffectiveMemberDesignationInput): Promise<GetEffectiveMemberDesignationOutput> {
    const space = await this.spaces.findByIdOrThrow(input.spaceId);

    const localDesignation = space.memberDesignation;
    let effectiveDesignation = localDesignation;
    let inheritedFromSpaceId: UUID | null = null;

    // Si pas de désignation locale, chercher dans les ancêtres
    if (!effectiveDesignation) {
      const pathParts = space.path.value.split('/').filter(Boolean);
      // Remonter du parent vers la racine
      for (let i = pathParts.length - 2; i >= 0; i--) { // -2 car on exclut l'espace lui-même
        const ancestorId = pathParts[i] as UUID;
        const ancestor = await this.spaces.findById(ancestorId);
        if (ancestor?.memberDesignation) {
          effectiveDesignation = ancestor.memberDesignation;
          inheritedFromSpaceId = ancestorId;
          break;
        }
      }
    }

    return {
      spaceId: space.id!,
      localDesignation,
      effectiveDesignation,
      inheritedFromSpaceId,
    };
  }
}