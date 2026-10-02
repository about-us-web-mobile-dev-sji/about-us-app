import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { InvitationStatus } from '../../../domain/enums/invitation-status.enum.js';
import { MembershipRole } from '../../../domain/enums/membership-role.enum.js';
import { millisecondsTransformer } from '../../../../../shared/infrastructure/database/milliseconds.transformer.js';

@Entity({ schema: 'school', name: 'school_invitations' })
export class SchoolInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'school_id' })
  schoolId!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({
    type: 'enum',
    enum: MembershipRole,
    default: MembershipRole.SCHOOL_ADMIN,
  })
  role!: MembershipRole;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @Column({
    type: 'bigint',
    name: 'expires_at',
    transformer: millisecondsTransformer,
  })
  expiresAt!: number;

  @Column({ type: 'uuid', name: 'invited_by' })
  invitedBy!: string;

  @Column({
    type: 'bigint',
    name: 'created_at',
    transformer: millisecondsTransformer,
  })
  createdAt!: number;

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'accepted_at',
    transformer: millisecondsTransformer,
  })
  acceptedAt!: number | null;

  @Column({ type: 'uuid', nullable: true, name: 'accepted_by' })
  acceptedBy!: string | null;
}
