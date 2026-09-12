import { SchoolMembership } from '../../../domain/entities/SchoolMembership.js';
import { SchoolMembershipPersistenceModel } from '../entities/SchoolMembershipPersistenceModel.js';

export class SchoolMembershipMapper {
  static toDomain(model: SchoolMembershipPersistenceModel): SchoolMembership {
    return new SchoolMembership(
      model.id,
      model.userId,
      model.schoolId,
      model.role,
      model.status,
      model.isPrimaryAdministrator,
      model.startedAt,
      model.endedAt,
      model.createdAt,
      model.updatedAt,
    );
  }

  static toPersistence(membership: SchoolMembership): SchoolMembershipPersistenceModel {
    const model = new SchoolMembershipPersistenceModel();
    model.id = membership.getId();
    model.userId = membership.getUserId();
    model.schoolId = membership.getSchoolId();
    model.role = membership.getRole();
    model.status = membership.getStatus();
    model.isPrimaryAdministrator = membership.getIsPrimaryAdministrator();
    model.startedAt = membership.getStartedAt();
    model.endedAt = membership.getEndedAt();
    model.createdAt = membership.getCreatedAt();
    model.updatedAt = membership.getUpdatedAt();
    return model;
  }
}
