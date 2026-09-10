import { AuthProvider } from '../../../domain/enums/auth-provider.enums.js';
import { millisecondsTransformer } from '../../../../../shared/infrastructure/database/milliseconds.transformer.js';
import {
  Entity,
  Column,
  PrimaryColumn,
  Unique,
} from 'typeorm';

@Unique('uq_identity_provider_subject', ['provider', 'providerSubject'])
@Unique('uq_identity_user_provider', ['userId', 'provider'])
@Entity({ name: 'auth_identities', schema: 'auth' })
export class AuthIdentityEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text', name: 'subjectId' })
  userId!: string;

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
