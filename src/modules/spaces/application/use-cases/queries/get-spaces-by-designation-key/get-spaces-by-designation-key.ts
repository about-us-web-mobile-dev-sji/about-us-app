import { Space } from '../../../../domain/entities/space.js';
import { MemberDesignation } from '../../../../domain/value-objects/member-designation.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { GetSpacesByDesignationKeyInput, GetSpacesByDesignationKeyOutput, GetSpacesByDesignationKeyOutputItem } from '../../../dto/space-designation.dto.js';
import type { UUID } from 'node:crypto';

export class GetSpacesByDesignationKeyUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async handle(input: GetSpacesByDesignationKeyInput): Promise<GetSpacesByDesignationKeyOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    // Use repository with filter on memberDesignationKey
    const result = await this.spaces.findChildren(input.schoolId, {
      memberDesignationKey: input.designationKey,
    }, { page, limit });

    return {
      items: result.items.map(this.toOutput),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  private toOutput(space: Space): GetSpacesByDesignationKeyOutputItem {
    const p = space.toPrimitives();
    return {
      id: p.id!,
      schoolId: p.schoolId,
      parentId: p.parentId,
      path: p.path.value,
      depth: p.depth,
      name: p.name,
      memberDesignation: p.memberDesignation,
    };
  }
}