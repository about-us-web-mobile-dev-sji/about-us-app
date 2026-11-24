import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import type { UUID } from 'node:crypto';
import { MediaCategorie } from '../../../domain/enums/media-categorie.enum.js';

@Entity({ schema: 'mediatheque', name: 'medias' })
@Index(['storageKey'], { unique: true })
export class MediaOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: UUID;

  @Column({ type: 'varchar', length: 255 })
  nom!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'bigint' })
  taille!: string;

  @Column({ type: 'varchar', length: 255, name: 'type_fichier' })
  typeFichier!: string;

  @Column({ type: 'varchar', length: 32 })
  categorie!: MediaCategorie;

  @Column({ type: 'varchar', length: 512, name: 'storage_key' })
  storageKey!: string;

  @Column({ type: 'varchar', length: 64, default: '1' })
  version!: string;

  @Column({ type: 'uuid', nullable: true, name: 'espace_id' })
  espaceId!: UUID | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
