import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditLogRepository } from '../../domain/repositories/AuditLogRepository.js';
import { AuditLog } from '../../domain/entities/AuditLog.js';
import { AuditAction } from '../../domain/enums/AuditAction.js';

@Injectable()
export class AuditService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async log(
    action: AuditAction,
    entityType: string,
    entityId: string,
    actorId: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const auditLog = new AuditLog(
      randomUUID(),
      action,
      entityType,
      entityId,
      actorId,
      metadata,
      new Date(),
    );

    await this.auditLogRepository.save(auditLog);
  }
}
