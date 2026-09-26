import { DataSource } from 'typeorm';
import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceMembershipRepository } from '../../../../domain/repositories/i-space-membership.repository.js';
import type { SpaceAuthorizationGateway } from '../../../ports/space-authorization.gateway.js';
import type { DeleteSpaceInput, DeleteSpaceOutput } from '../../../dto/space.dto.js';
import { SpaceNotFoundException, SpaceRootDeleteForbiddenException, SpaceHasChildrenException, SpaceDeletedException, SpaceCrossSchoolMoveForbiddenException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class DeleteSpaceUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly memberships: SpaceMembershipRepository,
    private readonly auth: SpaceAuthorizationGateway,
    private readonly dataSource: DataSource,
  ) {}

  async handle(input: DeleteSpaceInput): Promise<DeleteSpaceOutput> {
    return this.dataSource.transaction(async () => {
      const space = await this.spaces.findByIdOrThrow(input.spaceId);

      if (space.isRoot()) throw new SpaceRootDeleteForbiddenException();
      if (space.isDeleted()) throw new SpaceDeletedException(space.id!);

      await this.auth.canManageSpaceOrThrow(input.actorId, space.id!);

      const hasChildren = await this.spaces.hasChildren(space.id!);

      if (hasChildren && !input.recursive) {
        throw new SpaceHasChildrenException();
      }

      let deletedDescendantsCount = 0;

      if (input.recursive && hasChildren) {
        // Soft delete entire subtree
        // First, get all descendants
        const descendants = await this.spaces.findSubtree(space.id!);
        deletedDescendantsCount = descendants.length;

        // Soft delete all descendants
        for (const descendant of descendants) {
          descendant.softDelete();
          await this.spaces.save(descendant);
        }
      }

      // Soft delete the space itself
      space.softDelete();
      await this.spaces.save(space);

      const p = space.toPrimitives();
      return {
        id: p.id!,
        deletedAt: p.deletedAt!,
        status: p.status,
        recursive: input.recursive ?? false,
        deletedDescendantsCount: deletedDescendantsCount > 0 ? deletedDescendantsCount : undefined,
      };
    });
  }
}