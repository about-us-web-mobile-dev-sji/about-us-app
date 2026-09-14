import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { UUID } from 'node:crypto';

@Entity({ name: 'event_logs', schema: 'event' })
export class EventLogEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('text')
  name!: string;

  @Column('text')
  entityType!: string;

  @Column('text')
  entityId!: UUID;

  @Column({ type: 'text', nullable: true })
  actorId!: string | null;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;
}