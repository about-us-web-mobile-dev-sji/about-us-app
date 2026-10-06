import { Entity, Column, PrimaryGeneratedColumn, Index, Unique } from 'typeorm';
import { SpaceMembershipRole } from '../../../domain/enums/space-membership-role.js';
import { SpaceMembershipStatus } from '../../../domain/enums/space-membership-status.js';
import { millisecondsTransformer } from '../../../../../shared/infrastructure/database/milliseconds.transformer.js';
import type { UUID } from 'node:crypto';

@Entity({ schema: 'spaces', name: 'space_memberships' })
@Unique('uq_space_memberships_space_user_active', ['spaceId', 'userId'])
@Index('idx_space_memberships_space_id', ['spaceId'])
@Index('idx_space_memberships_user_id', ['userId'])
@Index('idx_space_memberships_role', ['role'])
@Index('idx_space_memberships_status', ['status'])
export class SpaceMembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: UUID;

  @Column({ type: 'uuid', name: 'space_id' })
  spaceId!: UUID;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: UUID;

  @Column({
    type: 'enum',
    enum: SpaceMembershipRole,
    default: SpaceMembershipRole.MEMBER,
  })
  role!: SpaceMembershipRole;

  @Column({
    type: 'enum',
    enum: SpaceMembershipStatus,
    default: SpaceMembershipStatus.ACTIVE,
  })
  status!: SpaceMembershipStatus;

  @Column({ type: 'uuid', nullable: true, name: 'granted_by' })
  grantedBy!: UUID | null;

  @Column({
    type: 'bigint',
    name: 'granted_at',
    transformer: millisecondsTransformer,
  })
  grantedAt!: number;

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'revoked_at',
    transformer: millisecondsTransformer,
  })
  revokedAt!: number | null;

  @Column({ type: 'uuid', nullable: true, name: 'revoked_by' })
  revokedBy!: UUID | null;
}