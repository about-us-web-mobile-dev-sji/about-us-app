import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SchoolStatus } from '../../../domain/enums/SchoolStatus.js';

@Entity('schools')
export class SchoolPersistenceModel {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 100 })
  identifier!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ length: 255 })
  address!: string;

  @Column({ length: 100 })
  city!: string;

  @Column({ name: 'postal_code', length: 20 })
  postalCode!: string;

  @Column({ length: 100 })
  country!: string;

  @Column({ type: 'varchar', length: 50 })
  status!: SchoolStatus;

  @Column({ name: 'main_administrator_id', type: 'uuid', nullable: true })
  mainAdministratorId!: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
