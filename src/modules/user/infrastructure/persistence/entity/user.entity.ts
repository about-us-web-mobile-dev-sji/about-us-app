import { Entity, Column, PrimaryColumn } from 'typeorm';
import { GlobalRole } from '../../../domain/enum/global-role.enum.js';
import UserStatus from '../../../domain/enum/user-status.enum.js';

@Entity({ name: 'users', schema: 'user' })
export class UserEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text', nullable: true })
  firstName!: string | null;

  @Column({ type: 'text', nullable: true })
  lastName!: string | null;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ type: 'enum', enum: UserStatus })
  status!: UserStatus;

  @Column({ type: 'enum', enum: GlobalRole })
  globalRole!: GlobalRole;
}
