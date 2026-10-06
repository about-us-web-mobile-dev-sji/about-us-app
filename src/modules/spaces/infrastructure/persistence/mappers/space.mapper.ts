import { Space } from '../../../domain/entities/space.js';
import { SpaceEntity } from '../typeorm/space.entity.js';
import { SpacePath } from '../../../domain/value-objects/space-path.js';
import { MemberDesignation } from '../../../domain/value-objects/member-designation.js';
import { SpaceKind } from '../../../domain/enums/space-kind.js';
import { SpaceStatus } from '../../../domain/enums/space-status.js';
import type { UUID } from 'node:crypto';

export class SpaceMapper {
  static toDomain(entity: SpaceEntity): Space {
    const props = {
      id: entity.id,
      schoolId: entity.schoolId,
      parentId: entity.parentId,
      path: SpacePath.reconstitute(entity.path),
      depth: entity.depth,
      kind: entity.kind,
      name: entity.name,
      description: entity.description,
      memberDesignation: entity.memberDesignationKey
        ? MemberDesignation.create(
            entity.memberDesignationKey,
            entity.memberDesignationSingular!,
            entity.memberDesignationPlural!,
          )
        : null,
      status: entity.status,
      version: entity.version,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
      archivedAt: entity.archivedAt ? new Date(entity.archivedAt) : null,
      deletedAt: entity.deletedAt ? new Date(entity.deletedAt) : null,
    };
    return Space.reconstitute(props);
  }

  static toPersistence(space: Space): SpaceEntity {
    const entity = new SpaceEntity();
    const primitives = space.toPrimitives();

    entity.id = primitives.id!;
    entity.schoolId = primitives.schoolId;
    entity.parentId = primitives.parentId;
    entity.path = primitives.path.value;
    entity.depth = primitives.depth;
    entity.kind = primitives.kind;
    entity.name = primitives.name;
    entity.description = primitives.description;
    entity.memberDesignationKey = primitives.memberDesignation?.key ?? null;
    entity.memberDesignationSingular = primitives.memberDesignation?.singular ?? null;
    entity.memberDesignationPlural = primitives.memberDesignation?.plural ?? null;
    entity.status = primitives.status;
    entity.version = primitives.version;
    entity.createdAt = primitives.createdAt.getTime();
    entity.updatedAt = primitives.updatedAt.getTime();
    entity.archivedAt = primitives.archivedAt?.getTime() ?? null;
    entity.deletedAt = primitives.deletedAt?.getTime() ?? null;

    return entity;
  }
}