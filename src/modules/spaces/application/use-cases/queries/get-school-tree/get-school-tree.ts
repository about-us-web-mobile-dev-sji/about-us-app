import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { GetSchoolTreeOutput } from '../../../dto/space.dto.js';
import type { UUID } from 'node:crypto';

export class GetSchoolTreeUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async handle(schoolId: UUID): Promise<GetSchoolTreeOutput> {
    const items = await this.spaces.findSchoolTree(schoolId);

    return {
      items: items.map((s) => this.toOutput(s)),
      schoolId,
    };
  }

  private toOutput(space: Space): GetSchoolTreeOutput['items'][0] {
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