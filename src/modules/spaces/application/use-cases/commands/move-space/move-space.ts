import { DataSource } from 'typeorm';
import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceAuthorizationGateway } from '../../../ports/space-authorization.gateway.js';
import type { MoveSpaceInput, MoveSpaceOutput } from '../../../dto/space.dto.js';
import { SpaceNotFoundException, SpaceRootMoveForbiddenException, SpaceCrossSchoolMoveForbiddenException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class MoveSpaceUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly auth: SpaceAuthorizationGateway,
    private readonly dataSource: DataSource,
  ) {}

  async handle(input: MoveSpaceInput): Promise<MoveSpaceOutput> {
    return this.dataSource.transaction(async () => {
      // 1. Charger l'espace à déplacer (C)
      const space = await this.spaces.findByIdOrThrow(input.spaceId);

      // 2. C ne doit pas être root
      if (space.isRoot()) throw new SpaceRootMoveForbiddenException();

      // 3. Sauvegarder l'ancien parentId
      const oldParentId = space.parentId;

      // 4. Charger le nouveau parent (X)
      const newParent = await this.spaces.findByIdOrThrow(input.newParentId);

      // 5. C et X doivent appartenir à la même école
      if (space.schoolId !== newParent.schoolId) throw new SpaceCrossSchoolMoveForbiddenException();

      // 6. X ne peut pas être C
      if (space.id === newParent.id) throw new Error('Cannot move space under itself');

      // 7. X ne peut pas être descendant de C
      if (newParent.path.isDescendantOf(space.path)) {
        throw new Error('Cannot move space under its own descendant');
      }

      // 8. L'acteur doit pouvoir gérer C et X
      await this.auth.canManageSpaceOrThrow(input.actorId, space.id!);
      await this.auth.canManageSpaceOrThrow(input.actorId, newParent.id!);

      // 9. Effectuer le déplacement (le domaine calcule oldPath, newPath, depthDelta)
      const { oldPath, newPath, depthDelta } = space.moveTo(newParent);

      // 10. Sauvegarder C
      await this.spaces.save(space);

      // 11. Mettre à jour le path et depth de tous les descendants en batch
      const updatedCount = await this.spaces.updateSubtreePath(oldPath, newPath, depthDelta);

      return {
        spaceId: space.id!,
        oldParentId,
        newParentId: input.newParentId,
        oldPath,
        newPath,
        depthDelta,
        updatedDescendantsCount: updatedCount,
      };
    });
  }
}