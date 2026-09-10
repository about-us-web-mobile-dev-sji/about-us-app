import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { SchoolStatus } from '../../../domain/enums/school-status.enum.js';

export const millisecondsTransformer = {
  to: (value: Date | null | undefined) => (value ? value.getTime() : null),
  from: (value: number | null) => (value !== null ? new Date(value) : null),
};

@Entity({ schema: 'school', name: 'schools' })
export class SchoolEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'postal_code' })
  postalCode!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'phone_number' })
  phoneNumber!: string | null;

  @Column({ type: 'varchar', length: 320, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website!: string | null;

  @Column({
    type: 'enum',
    enum: SchoolStatus,
    default: SchoolStatus.ACTIVE,
  })
  status!: SchoolStatus;

  @Column({ type: 'uuid', nullable: true, name: 'admin_user_id' })
  adminUserId!: string | null;

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

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;
}
