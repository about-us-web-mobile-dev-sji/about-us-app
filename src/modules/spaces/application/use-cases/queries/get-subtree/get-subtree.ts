import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { GetSubtreeInput, GetSubtreeOutput } from '../../../dto/space.dto.js';
import type { UUID } from 'node:crypto';

export class GetSubtreeUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async handle(input: GetSubtreeInput): Promise<GetSubtreeOutput> {
    const items = await this.spaces.findSubtree(input.rootId, input.maxDepth);

    return {
      items: items.map((s) => this.toOutput(s)),
      rootId: input.rootId,
      maxDepth: input.maxDepth ?? null,
    };
  }

  private toOutput(space: Space): GetSubtreeOutput['items'][0] {
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