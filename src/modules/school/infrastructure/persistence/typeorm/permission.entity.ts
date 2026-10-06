import {
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SchoolRoleEntity } from './school-role.entity.js';

@Entity({ schema: 'school', name: 'permissions' })
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80 })
  code!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @ManyToMany(() => SchoolRoleEntity, (role) => role.permissions)
  roles!: SchoolRoleEntity[];
}