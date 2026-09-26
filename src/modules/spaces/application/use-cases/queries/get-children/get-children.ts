import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { GetChildrenInput, GetChildrenOutput } from '../../../dto/space.dto.js';
import type { UUID } from 'node:crypto';

export class GetChildrenUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async handle(input: GetChildrenInput): Promise<GetChildrenOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;

    const result = await this.spaces.findChildren(input.parentId, {
      status: input.status,
      kind: input.kind,
    }, { page, limit });

    return {
      items: result.items.map((s) => this.toOutput(s)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  private toOutput(space: Space): GetChildrenOutput['items'][0] {
    const p = space.toPrimitives();
    return {
      id: p.id!,
      schoolId: p.schoolId,
      parentId: p.parentId!,
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