import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { SpaceAuthorizationGateway } from '../../../ports/space-authorization.gateway.js';
import type { CreateSpaceInput, CreateSpaceOutput } from '../../../dto/space.dto.js';
import { SpaceParentNotFoundException, SpaceParentRequiredException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class CreateSpaceUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly auth: SpaceAuthorizationGateway,
  ) {}

  async handle(input: CreateSpaceInput): Promise<CreateSpaceOutput> {
    // 1. Vérifier que le parent existe
    const parent = await this.spaces.findById(input.parentId);
    if (!parent) throw new SpaceParentNotFoundException(input.parentId);

    // 2. Vérifier qu'il n'est pas supprimé
    if (parent.isDeleted()) throw new SpaceParentNotFoundException(input.parentId);

    // 3. Vérifier que l'acteur peut administrer le parent
    await this.auth.canManageSpaceOrThrow(input.actorId, parent.id!);

    // 4. Créer l'espace (le domaine calcule schoolId, path, depth)
    const space = Space.createStandard({
      parent,
      name: input.name,
      description: input.description,
      memberDesignation: input.memberDesignation,
    });

    // 5. Persister
    const saved = await this.spaces.save(space);

    return this.toOutput(saved);
  }

  private toOutput(space: Space): CreateSpaceOutput {
    const primitives = space.toPrimitives();
    return {
      id: primitives.id!,
      schoolId: primitives.schoolId,
      parentId: primitives.parentId!,
      path: primitives.path.value,
      depth: primitives.depth,
      kind: primitives.kind,
      name: primitives.name,
      description: primitives.description,
      memberDesignation: primitives.memberDesignation,
      status: primitives.status,
      version: primitives.version,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
      archivedAt: primitives.archivedAt,
      deletedAt: primitives.deletedAt,
    };
  }
}