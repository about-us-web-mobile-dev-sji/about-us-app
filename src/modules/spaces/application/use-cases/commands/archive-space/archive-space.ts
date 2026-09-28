import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceAuthorizationGateway } from '../../../ports/space-authorization.gateway.js';
import type { ArchiveSpaceInput, ArchiveSpaceOutput } from '../../../dto/space.dto.js';
import { SpaceNotFoundException, SpaceAlreadyArchivedException, SpaceDeletedException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class ArchiveSpaceUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly auth: SpaceAuthorizationGateway,
  ) {}

  async handle(input: ArchiveSpaceInput): Promise<ArchiveSpaceOutput> {
    const space = await this.spaces.findByIdOrThrow(input.spaceId);

    if (space.isDeleted()) throw new SpaceDeletedException(space.id!);
    if (space.isArchived()) throw new SpaceAlreadyArchivedException();

    await this.auth.canManageSpaceOrThrow(input.actorId, space.id!);

    space.archive();
    const saved = await this.spaces.save(space);

    const p = saved.toPrimitives();
    return {
      id: p.id!,
      status: p.status,
      archivedAt: p.archivedAt!,
      updatedAt: p.updatedAt,
    };
  }
}