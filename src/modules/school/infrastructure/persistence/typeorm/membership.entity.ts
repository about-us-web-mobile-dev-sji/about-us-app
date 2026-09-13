import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'school', name: 'memberships' })
@Index(['schoolId', 'userId'], { unique: true })
export class MembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'school_id' })
  schoolId!: string;

  @Column({ type: 'text', name: 'user_id' })
  userId!: string;
}