import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';
import { AuditAction } from '../../../domain/enums/AuditAction.js';

@Entity('audit_logs')
export class AuditLogPersistenceModel {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  action!: AuditAction;

  @Column({ name: 'entity_type', length: 50 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
