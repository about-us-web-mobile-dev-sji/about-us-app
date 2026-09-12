import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogPersistenceModel } from './infrastructure/persistence/entities/AuditLogPersistenceModel.js';
import { TypeOrmAuditLogRepository } from './infrastructure/persistence/repositories/TypeOrmAuditLogRepository.js';
import { AuditLogRepository } from './domain/repositories/AuditLogRepository.js';
import { AuditService } from './application/services/AuditService.js';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogPersistenceModel])],
  providers: [
    {
      provide: 'AuditLogRepository',
      useClass: TypeOrmAuditLogRepository,
    },
    {
      provide: AuditLogRepository,
      useExisting: 'AuditLogRepository',
    },
    AuditService,
  ],
  exports: [AuditService],
})
export class AuditModule {}
