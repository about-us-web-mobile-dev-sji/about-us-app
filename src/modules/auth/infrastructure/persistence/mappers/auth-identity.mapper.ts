import {
  AuthIdentity,
  type NewAuthIdentity,
} from '../../../domain/entities/auth-identity.js';
import { AuthIdentityEntity } from '../typeorm/auth-identity.entity.js';
export class AuthIdentityMapper {
  static toDomain(row: AuthIdentityEntity): AuthIdentity {
    return AuthIdentity.reconstitute({
      id: row.id,
      subjectId: row.subjectId,
      provider: row.provider,
      providerSubject: row.providerSubject,
      passwordHash: row.passwordHash,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      lastAuthenticatedAt:
        row.lastAuthenticatedAt === null
          ? null
          : new Date(row.lastAuthenticatedAt),
    });
  }
  static toPersistence(value: NewAuthIdentity, id: string): AuthIdentityEntity {
    return Object.assign(new AuthIdentityEntity(), {
      id,
      subjectId: value.subjectId,
      provider: value.provider,
      providerSubject: value.providerSubject,
      passwordHash: value.passwordHash,
      createdAt: value.createdAt.getTime(),
      updatedAt: value.updatedAt.getTime(),
      lastAuthenticatedAt: value.lastAuthenticatedAt?.getTime() ?? null,
    });
  }
}
