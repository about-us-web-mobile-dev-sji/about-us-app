import { SchoolMembership } from '../../../domain/entities/school-membership.entity.js';
import { SchoolMembershipEntity } from '../typeorm/school-membership.entity.js';
import { SchoolRoleEntity } from '../typeorm/school-role.entity.js';

export class SchoolMembershipMapper {
  static toDomain(entity: SchoolMembershipEntity): SchoolMembership {
    return SchoolMembership.reconstitute({
      id: entity.id,
      schoolId: entity.schoolId,
      userId: entity.userId,
      status: entity.status,
      grantedBy: entity.grantedBy,
      grantedAt: new Date(entity.grantedAt),
      revokedAt: entity.revokedAt ? new Date(entity.revokedAt) : null,
      revokedBy: entity.revokedBy,
      roleIds: (entity.roles ?? []).map((role) => role.id),
    });
  }

  static toPersistence(membership: SchoolMembership): SchoolMembershipEntity {
    const primitives = membership.toPrimitives();
    const entity = new SchoolMembershipEntity();

    if (primitives.id) {
      entity.id = primitives.id;
    }
    entity.schoolId = primitives.schoolId;
    entity.userId = primitives.userId;
    entity.status = primitives.status;
    entity.grantedBy = primitives.grantedBy;
    entity.grantedAt = primitives.grantedAt.getTime();
    entity.revokedAt = primitives.revokedAt
      ? primitives.revokedAt.getTime()
      : null;
    entity.revokedBy = primitives.revokedBy;
    entity.roles = primitives.roleIds.map((id) => ({ id }) as SchoolRoleEntity);

    return entity;
  }
}
