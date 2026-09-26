import { Space } from '../../../../domain/entities/space.js';
import { MemberDesignation } from '../../../../domain/value-objects/member-designation.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceAuthorizationGateway } from '../../../ports/space-authorization.gateway.js';
import type { UpdateMemberDesignationInput, UpdateMemberDesignationOutput } from '../../../dto/space-designation.dto.js';
import { SpaceNotFoundException, SpaceDeletedException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class UpdateMemberDesignationUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly auth: SpaceAuthorizationGateway,
  ) {}

  async handle(input: UpdateMemberDesignationInput): Promise<UpdateMemberDesignationOutput> {
    const space = await this.spaces.findByIdOrThrow(input.spaceId);

    if (space.isDeleted()) throw new SpaceDeletedException(space.id!);

    await this.auth.canManageSpaceOrThrow(input.actorId, space.id!);

    space.setMemberDesignation(input.memberDesignation);
    const saved = await this.spaces.save(space);

    const p = saved.toPrimitives();
    return {
      id: p.id!,
      spaceId: p.id!,
      memberDesignation: p.memberDesignation,
      updatedAt: p.updatedAt,
    };
  }
}