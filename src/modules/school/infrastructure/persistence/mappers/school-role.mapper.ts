import { SchoolAction } from '../../../domain/enums/school-action.enum.js';
import { SchoolRole } from '../../../domain/entities/school-role.entity.js';
import { SchoolRoleEntity } from '../typeorm/school-role.entity.js';

export class SchoolRoleMapper {
  static toDomain(entity: SchoolRoleEntity): SchoolRole {
    return SchoolRole.reconstitute({
      id: entity.id,
      schoolId: entity.schoolId,
      key: entity.key,
      name: entity.name,
      description: entity.description,
      permissions: (entity.permissions ?? []).map((permission) => permission.code as SchoolAction),
      isSystem: entity.isSystem,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
    });
  }

  static toPersistence(role: SchoolRole): SchoolRoleEntity {
    const primitives = role.toPrimitives();
    const entity = new SchoolRoleEntity();
    if (primitives.id) {
      entity.id = primitives.id;
    }
    entity.schoolId = primitives.schoolId;
    entity.key = primitives.key;
    entity.name = primitives.name;
    entity.description = primitives.description;
    entity.permissions = [];
    entity.isSystem = primitives.isSystem;
    entity.createdAt = primitives.createdAt.getTime();
    entity.updatedAt = primitives.updatedAt.getTime();
    return entity;
  }
}
