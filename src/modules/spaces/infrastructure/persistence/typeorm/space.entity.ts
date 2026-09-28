import { Entity, Column, PrimaryGeneratedColumn, Index, Unique } from 'typeorm';
import { SpaceKind } from '../../../domain/enums/space-kind.js';
import { SpaceStatus } from '../../../domain/enums/space-status.js';
import { millisecondsTransformer } from '../../../../../shared/infrastructure/database/milliseconds.transformer.js';
import type { UUID } from 'node:crypto';

@Entity({ schema: 'spaces', name: 'spaces' })
@Unique('uq_spaces_school_kind_root', ['schoolId', 'kind'])
@Index('idx_spaces_school_id', ['schoolId'])
@Index('idx_spaces_parent_id', ['parentId'])
@Index('idx_spaces_path', ['path'])
@Index('idx_spaces_status', ['status'])
@Index('idx_spaces_kind', ['kind'])
export class SpaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: UUID;

  @Column({ type: 'uuid', name: 'school_id' })
  schoolId!: UUID;

  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId!: UUID | null;

  @Column({ type: 'varchar', length: 2000 })
  path!: string;

  @Column({ type: 'int' })
  depth!: number;

  @Column({
    type: 'enum',
    enum: SpaceKind,
    default: SpaceKind.STANDARD,
  })
  kind!: SpaceKind;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'member_designation_key' })
  memberDesignationKey!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'member_designation_singular' })
  memberDesignationSingular!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'member_designation_plural' })
  memberDesignationPlural!: string | null;

  @Column({
    type: 'enum',
    enum: SpaceStatus,
    default: SpaceStatus.ACTIVE,
  })
  status!: SpaceStatus;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({
    type: 'bigint',
    name: 'created_at',
    transformer: millisecondsTransformer,
  })
  createdAt!: number;

  @Column({
    type: 'bigint',
    name: 'updated_at',
    transformer: millisecondsTransformer,
  })
  updatedAt!: number;

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'archived_at',
    transformer: millisecondsTransformer,
  })
  archivedAt!: number | null;

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'deleted_at',
    transformer: millisecondsTransformer,
  })
  deletedAt!: number | null;
}