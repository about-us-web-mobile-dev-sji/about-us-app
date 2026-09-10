import { SessionStatus } from '../../../domain/enums/session-status.enums.js';
import { millisecondsTransformer } from '../../../../../shared/infrastructure/database/milliseconds.transformer.js';
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../../../user/infrastructure/persistence/typeorm/user.entity.js';
import { AuthIdentityEntity } from './auth-identity.entity.js';

@Entity({ name: 'auth_sessions', schema: 'auth' })
export class AuthSessionEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  subjectId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  user!: UserEntity;

  @Column('text')
  identityId!: string;

  @ManyToOne(() => AuthIdentityEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'identityId' })
  identity!: AuthIdentityEntity;

  @Column('text')
  status!: SessionStatus;

  @Column({ type: 'bigint', transformer: millisecondsTransformer })
  createdAt!: number;

  @Column({ type: 'bigint', transformer: millisecondsTransformer })
  lastActivityAt!: number;

  @Column({ type: 'bigint', transformer: millisecondsTransformer })
  expiresAt!: number;

  @Column({
    type: 'bigint',
    transformer: millisecondsTransformer,
    nullable: true,
  })
  revokedAt!: number | null;

  @Column({ type: 'text', nullable: true })
  revocationReason!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;
}
