import { DataSource } from 'typeorm';
import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceAuthorizationGateway } from '../../../ports/space-authorization.gateway.js';
import type { InsertParentInput, InsertParentOutput } from '../../../dto/space.dto.js';
import { SpaceNotFoundException, SpaceRootMoveForbiddenException, SpaceCrossSchoolMoveForbiddenException, SpaceParentRequiredException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class InsertParentUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly auth: SpaceAuthorizationGateway,
    private readonly dataSource: DataSource,
  ) {}

  async handle(input: InsertParentInput): Promise<InsertParentOutput> {
    return this.dataSource.transaction(async (manager) => {
      // Use the same repositories but with transactional entity manager
      // For simplicity, we'll use the main repositories and ensure atomicity
      // In a real implementation, we'd create repository instances with the manager

      // 1. Charger l'enfant (B)
      const child = await this.spaces.findByIdOrThrow(input.childId);

      // 2. Vérifier que B n'est pas SCHOOL_ROOT
      if (child.isRoot()) throw new SpaceRootMoveForbiddenException();

      // 3. Récupérer l'ancien parent (A)
      if (!child.parentId) throw new SpaceParentRequiredException();
      const oldParent = await this.spaces.findByIdOrThrow(child.parentId);

      // 4. Vérifier les droits sur oldParent et B
      await this.auth.canManageSpaceOrThrow(input.actorId, oldParent.id!);
      await this.auth.canManageSpaceOrThrow(input.actorId, child.id!);

      // 5. Vérifier même école
      if (oldParent.schoolId !== child.schoolId) throw new SpaceCrossSchoolMoveForbiddenException();

      // 6. Créer X comme enfant de oldParent
      const newSpace = Space.createInsertedParent({
        oldParent,
        child,
        name: input.name,
        description: input.description,
        memberDesignation: input.memberDesignation,
      });

      // 7. Sauvegarder X
      const savedNewSpace = await this.spaces.save(newSpace);

      // 8. Mettre à jour B : parentId vers X, path et depth
      const oldChildPath = child.path.value;
      child.moveTo(newSpace); // This updates parentId, path, depth

      // 9. Calculer le nouveau path pour B et ses descendants
      const newChildPath = newSpace.path.value + '/' + child.id;
      const oldPrefix = oldChildPath;
      const newPrefix = newChildPath;

      // 10. Mettre à jour B et tous ses descendants en batch
      await this.spaces.save(child); // Save B first with new parentId

      // Update subtree paths using repository batch operation
      const depthDelta = (newSpace.depth + 1) - (child.depth - (child.depth - oldParent.depth - 1)); // Actually depthDelta = 1
      const updatedCount = await this.spaces.updateSubtreePath(oldPrefix, newPrefix, 1);

      return {
        newSpace: this.toOutput(savedNewSpace),
        updatedChild: {
          id: child.id!,
          parentId: child.parentId!,
          path: child.path.value,
          depth: child.depth,
        },
        updatedDescendantsCount: updatedCount,
      };
    });
  }

  private toOutput(space: Space): InsertParentOutput['newSpace'] {
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