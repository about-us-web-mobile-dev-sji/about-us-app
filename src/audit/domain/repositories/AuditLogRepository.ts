import { AuditLog } from '../entities/AuditLog.js';

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
  findByEntityId(entityId: string): Promise<AuditLog[]>;
  findByActorId(actorId: string): Promise<AuditLog[]>;
  findAll(limit?: number): Promise<AuditLog[]>;
}
