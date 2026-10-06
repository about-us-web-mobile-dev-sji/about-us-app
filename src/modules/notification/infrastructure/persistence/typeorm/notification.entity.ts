import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { UUID } from 'node:crypto';
import { NotificationType } from '../../../domain/enums/notification-type.enum.js';
import { Severity } from '../../../domain/enums/severity.enum.js';

@Entity({ schema: 'notification', name: 'notifications' })
@Index(['requestId', 'recipientId'], { unique: true })
@Index(['recipientId', 'createdAt'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: UUID;

  @Column({ type: 'uuid', name: 'request_id' })
  requestId!: string;

  @Column({ type: 'uuid', name: 'recipient_id' })
  recipientId!: string;

  @Column({ type: 'uuid', nullable: true, name: 'organization_id' })
  organizationId!: string | null;

  @Column({ type: 'varchar', length: 80 })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 20 })
  severity!: Severity;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 8 })
  locale!: string;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
  readAt!: Date | null;
}
