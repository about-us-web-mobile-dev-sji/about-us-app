import { SchoolInvitation } from '../../../domain/entities/school-invitation.entity.js';
import { SchoolInvitationEntity } from '../typeorm/school-invitation.entity.js';

export class SchoolInvitationMapper {
  static toDomain(entity: SchoolInvitationEntity): SchoolInvitation {
    return SchoolInvitation.reconstitute({
      id: entity.id,
      schoolId: entity.schoolId,
      email: entity.email,
      roleId: entity.roleId,
      tokenHash: entity.tokenHash,
      status: entity.status,
      expiresAt: new Date(entity.expiresAt),
      invitedBy: entity.invitedBy,
      createdAt: new Date(entity.createdAt),
      acceptedAt: entity.acceptedAt !== null ? new Date(entity.acceptedAt) : null,
      acceptedBy: entity.acceptedBy,
    });
  }

  static toPersistence(invitation: SchoolInvitation): SchoolInvitationEntity {
    const primitives = invitation.toPrimitives();
    const entity = new SchoolInvitationEntity();

    if (primitives.id) {
      entity.id = primitives.id;
    }
    entity.schoolId = primitives.schoolId;
    entity.email = primitives.email;
    entity.roleId = primitives.roleId;
    entity.tokenHash = primitives.tokenHash;
    entity.status = primitives.status;
    entity.expiresAt = primitives.expiresAt.getTime();
    entity.invitedBy = primitives.invitedBy;
    entity.createdAt = primitives.createdAt.getTime();
    entity.acceptedAt = primitives.acceptedAt
      ? primitives.acceptedAt.getTime()
      : null;
    entity.acceptedBy = primitives.acceptedBy;

    return entity;
  }
}
