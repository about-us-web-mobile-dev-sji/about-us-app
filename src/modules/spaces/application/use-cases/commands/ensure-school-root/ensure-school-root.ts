import { Space } from '../../../../domain/entities/space.js';
import type { SpaceRepository } from '../../../../domain/repositories/i-space.repository.js';
import type { EnsureSchoolRootInput, EnsureSchoolRootOutput } from '../../../dto/school-root.dto.js';
import { SchoolRootAlreadyExistsException } from '../../../../domain/exceptions/space.exceptions.js';
import type { UUID } from 'node:crypto';

export class EnsureSchoolRootUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async handle(input: EnsureSchoolRootInput): Promise<EnsureSchoolRootOutput> {
    // 1. Vérifier si le root existe déjà
    const existingRoot = await this.spaces.findSchoolRoot(input.schoolId);
    if (existingRoot) {
      const p = existingRoot.toPrimitives();
      return {
        id: p.id!,
        schoolId: p.schoolId,
        name: p.name,
        path: p.path.value,
        depth: p.depth,
        kind: p.kind,
        isNew: false,
      };
    }

    // 2. Vérifier qu'aucun root n'existe déjà (double-check en cas de race condition)
    // La contrainte DB unique (schoolId + kind = SCHOOL_ROOT) va attraper les doublons
    const root = Space.createRoot({
      schoolId: input.schoolId,
      name: input.name,
      description: 'Espace racine de l\'école',
    });

    const saved = await this.spaces.save(root);

    const p = saved.toPrimitives();
    return {
      id: p.id!,
      schoolId: p.schoolId,
      name: p.name,
      path: p.path.value,
      depth: p.depth,
      kind: p.kind,
      isNew: true,
    };
  }
}