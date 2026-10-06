import {
  Entity,
  Column,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MembershipStatus } from '../../../domain/enums/membership-status.enum.js';
import { millisecondsTransformer } from '../../../../../shared/infrastructure/database/milliseconds.transformer.js';
import { SchoolRoleEntity } from './school-role.entity.js';


@Entity({ schema: 'school', name: 'school_memberships' })
export class SchoolMembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'school_id' })
  schoolId!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToMany(() => SchoolRoleEntity, (role) => role.memberships, {
    eager: true,
  })
  @JoinTable({
    schema: 'school',
    name: 'school_membership_roles',
    joinColumn: { name: 'membership_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'school_role_id', referencedColumnName: 'id' },
  })
  roles!: SchoolRoleEntity[];

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
