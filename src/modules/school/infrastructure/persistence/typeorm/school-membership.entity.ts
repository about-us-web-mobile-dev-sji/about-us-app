import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { MembershipRole } from '../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../domain/enums/membership-status.enum.js';

const millisecondsTransformer = {
  to: (value: Date | null | undefined) => (value ? value.getTime() : null),
  from: (value: number | null) => (value !== null ? new Date(value) : null),
};

@Entity({ schema: 'school', name: 'school_memberships' })
export class SchoolMembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'school_id' })
  schoolId!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: MembershipRole,
    default: MembershipRole.SCHOOL_MEMBER,
  })
  role!: MembershipRole;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.ACTIVE,
  })
  status!: MembershipStatus;

  @Column({ type: 'uuid', nullable: true, name: 'granted_by' })
  grantedBy!: string | null;

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
  revokedBy!: string | null;
}
