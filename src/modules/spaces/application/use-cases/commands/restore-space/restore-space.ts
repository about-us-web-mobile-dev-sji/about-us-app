import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceAuthorizationGateway } from '../../../ports/space-authorization.gateway.js';
import type { RestoreSpaceInput, RestoreSpaceOutput } from '../../../dto/space.dto.js';
import { SpaceNotFoundException, SpaceNotArchivedException, SpaceDeletedException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class RestoreSpaceUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly auth: SpaceAuthorizationGateway,
  ) {}

  async handle(input: RestoreSpaceInput): Promise<RestoreSpaceOutput> {
    const space = await this.spaces.findByIdOrThrow(input.spaceId);

    if (space.isDeleted()) throw new SpaceDeletedException(space.id!);
    if (!space.isArchived()) throw new SpaceNotArchivedException();

    await this.auth.canManageSpaceOrThrow(input.actorId, space.id!);

    space.restore();
    const saved = await this.spaces.save(space);

    const p = saved.toPrimitives();
    return {
      id: p.id!,
      status: p.status,
      archivedAt: p.archivedAt,
      updatedAt: p.updatedAt,
    };
  }
}