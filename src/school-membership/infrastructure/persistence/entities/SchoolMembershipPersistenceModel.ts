import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../../../shared/domain/enums/Role.js';
import { MembershipStatus } from '../../../domain/enums/MembershipStatus.js';

@Entity('school_memberships')
export class SchoolMembershipPersistenceModel {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ type: 'varchar', length: 50 })
  role!: Role;

  @Column({ type: 'varchar', length: 50 })
  status!: MembershipStatus;

  @Column({ name: 'is_primary_administrator', type: 'boolean', default: false })
  isPrimaryAdministrator!: boolean;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
