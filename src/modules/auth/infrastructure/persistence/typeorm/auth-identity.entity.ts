import { AuthProvider } from '../../../domain/enums/auth-provider.enums.js';
import { millisecondsTransformer } from '../../../../../shared/infrastructure/database/milliseconds.transformer.js';
import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../../../user/infrastructure/persistence/typeorm/user.entity.js';

@Unique('uq_identity_provider_subject', ['provider', 'providerSubject'])
@Unique('uq_identity_user_provider', ['subjectId', 'provider'])
@Entity({ name: 'auth_identities', schema: 'auth' })
export class AuthIdentityEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  subjectId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  user!: UserEntity;

  @Column('text')
  provider!: AuthProvider;

  @Column('text')
  providerSubject!: string;

  @Column('text', { nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'bigint', transformer: millisecondsTransformer })
  createdAt!: number;

  @Column({ type: 'bigint', transformer: millisecondsTransformer })
  updatedAt!: number;

  @Column({
    type: 'bigint',
    transformer: millisecondsTransformer,
    nullable: true,
  })
  lastAuthenticatedAt!: number | null;
}
