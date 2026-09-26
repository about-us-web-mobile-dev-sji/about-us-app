import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { GetSpaceOutput } from '../../../dto/space.dto.js';
import { SpaceNotFoundException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class GetSpaceUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async handle(spaceId: UUID): Promise<GetSpaceOutput> {
    const space = await this.spaces.findByIdOrThrow(spaceId);
    return this.toOutput(space);
  }

  private toOutput(space: Space): GetSpaceOutput {
    const p = space.toPrimitives();
    return {
      id: p.id!,
      schoolId: p.schoolId,
      parentId: p.parentId ?? null,
      path: p.path.value,
      depth: p.depth,
      kind: p.kind,
      name: p.name,
      description: p.description,
      memberDesignation: p.memberDesignation,
      status: p.status,
      version: p.version,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      archivedAt: p.archivedAt,
      deletedAt: p.deletedAt,
    };
  }
}