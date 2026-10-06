import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { millisecondsTransformer } from '../../../../../shared/infrastructure/database/milliseconds.transformer.js';
import type { SchoolRoleKey } from '../../../domain/enums/school-role-key.enum.js';
import { PermissionEntity } from './permission.entity.js';
import { SchoolMembershipEntity } from './school-membership.entity.js';

@Entity({ schema: 'school', name: 'school_roles' })
@Index(['schoolId', 'key'], { unique: true, where: '"key" IS NOT NULL' })
export class SchoolRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'school_id' })
  schoolId!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  key!: SchoolRoleKey | null;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @ManyToMany(() => PermissionEntity, (permission) => permission.roles, {
    eager: true,
  })
  @JoinTable({
    schema: 'school',
    name: 'school_role_permissions',
    joinColumn: { name: 'school_role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: PermissionEntity[];

  @ManyToMany(() => SchoolMembershipEntity, (membership) => membership.roles)
  memberships!: SchoolMembershipEntity[];

  @Column({ type: 'boolean', name: 'is_system', default: false })
  isSystem!: boolean;

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
}
