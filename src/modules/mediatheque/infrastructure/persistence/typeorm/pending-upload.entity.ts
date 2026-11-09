import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { UUID } from 'node:crypto';

@Entity({ schema: 'mediatheque', name: 'pending_uploads' })
export class PendingUploadOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 512 })
  key!: string;

  @Column({ type: 'varchar', length: 255, name: 'mime_type' })
  mimeType!: string;

  @Column({ type: 'bigint' })
  size!: string;

  @Column({ type: 'uuid', nullable: true, name: 'espace_id' })
  espaceId!: UUID | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
