import { AuditLog } from '../../../domain/entities/AuditLog.js';
import { AuditLogPersistenceModel } from '../entities/AuditLogPersistenceModel.js';

export class AuditLogMapper {
  static toDomain(model: AuditLogPersistenceModel): AuditLog {
    return new AuditLog(
      model.id,
      model.action,
      model.entityType,
      model.entityId,
      model.actorId,
      model.metadata || {},
      model.createdAt,
    );
  }

  static toPersistence(auditLog: AuditLog): AuditLogPersistenceModel {
    const model = new AuditLogPersistenceModel();
    model.id = auditLog.getId();
    model.action = auditLog.getAction();
    model.entityType = auditLog.getEntityType();
    model.entityId = auditLog.getEntityId();
    model.actorId = auditLog.getActorId();
    model.metadata = auditLog.getMetadata();
    model.createdAt = auditLog.getCreatedAt();
    return model;
  }
}
