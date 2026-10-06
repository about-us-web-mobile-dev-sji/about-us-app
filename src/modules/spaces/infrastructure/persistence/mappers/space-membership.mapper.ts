import { SpaceMembership } from '../../../domain/entities/space-membership.js';
import { SpaceMembershipEntity } from '../typeorm/space-membership.entity.js';
import { SpaceMembershipRole } from '../../../domain/enums/space-membership-role.js';
import { SpaceMembershipStatus } from '../../../domain/enums/space-membership-status.js';
import type { UUID } from 'node:crypto';

export class SpaceMembershipMapper {
  static toDomain(entity: SpaceMembershipEntity): SpaceMembership {
    const props = {
      id: entity.id,
      spaceId: entity.spaceId,
      userId: entity.userId,
      role: entity.role,
      status: entity.status,
      grantedBy: entity.grantedBy,
      grantedAt: new Date(entity.grantedAt),
      revokedAt: entity.revokedAt ? new Date(entity.revokedAt) : null,
      revokedBy: entity.revokedBy,
    };
    return SpaceMembership.reconstitute(props);
  }

  static toPersistence(membership: SpaceMembership): SpaceMembershipEntity {
    const entity = new SpaceMembershipEntity();
    const primitives = membership.toPrimitives();

    entity.id = primitives.id!;
    entity.spaceId = primitives.spaceId;
    entity.userId = primitives.userId;
    entity.role = primitives.role;
    entity.status = primitives.status;
    entity.grantedBy = primitives.grantedBy;
    entity.grantedAt = primitives.grantedAt.getTime();
    entity.revokedAt = primitives.revokedAt?.getTime() ?? null;
    entity.revokedBy = primitives.revokedBy;

    return entity;
  }
}