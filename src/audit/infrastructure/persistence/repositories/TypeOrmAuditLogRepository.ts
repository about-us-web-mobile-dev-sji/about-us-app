import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogRepository } from '../../../domain/repositories/AuditLogRepository.js';
import { AuditLog } from '../../../domain/entities/AuditLog.js';
import { AuditLogPersistenceModel } from '../entities/AuditLogPersistenceModel.js';
import { AuditLogMapper } from '../mappers/AuditLogMapper.js';

@Injectable()
export class TypeOrmAuditLogRepository implements AuditLogRepository {
  constructor(
    @InjectRepository(AuditLogPersistenceModel)
    private readonly repository: Repository<AuditLogPersistenceModel>,
  ) {}

  async save(auditLog: AuditLog): Promise<AuditLog> {
    const model = AuditLogMapper.toPersistence(auditLog);
    const saved = await this.repository.save(model);
    return AuditLogMapper.toDomain(saved);
  }

  async findByEntityId(entityId: string): Promise<AuditLog[]> {
    const models = await this.repository.find({
      where: { entityId },
      order: { createdAt: 'DESC' },
    });
    return models.map((model) => AuditLogMapper.toDomain(model));
  }

  async findByActorId(actorId: string): Promise<AuditLog[]> {
    const models = await this.repository.find({
      where: { actorId },
      order: { createdAt: 'DESC' },
    });
    return models.map((model) => AuditLogMapper.toDomain(model));
  }

  async findAll(limit: number = 100): Promise<AuditLog[]> {
    const models = await this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return models.map((model) => AuditLogMapper.toDomain(model));
  }
}
