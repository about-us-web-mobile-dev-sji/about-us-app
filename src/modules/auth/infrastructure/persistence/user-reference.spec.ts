import { describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { AuthIdentityEntity } from './typeorm/auth-identity.entity.js';
import { AuthSessionEntity } from './typeorm/auth-session.entity.js';
import { AuthIdentityMapper } from './mappers/auth-identity.mapper.js';
import { SessionMapper } from './mappers/session.mapper.js';
import { AuthProvider } from '../../domain/enums/auth-provider.enums.js';
import { SessionStatus } from '../../domain/enums/session-status.enums.js';

class MetadataSource extends DataSource {
  build() { return this.buildMetadatas(); }
}
describe('Auth scalar user references', () => {
  it('builds ORM metadata without registering UserEntity', async () => {
    const source = new MetadataSource({ type: 'postgres', entities: [AuthIdentityEntity, AuthSessionEntity] });
    await source.build();
    for (const entity of [AuthIdentityEntity, AuthSessionEntity]) {
      const metadata = source.getMetadata(entity);
      expect(metadata.findColumnWithPropertyName('userId')?.databaseName).toBe('subjectId');
      expect(metadata.relations.some((relation) => relation.propertyName === 'user')).toBe(false);
    }
    expect(source.getMetadata(AuthSessionEntity).relations.map((r) => r.propertyName)).toEqual(['identity']);
  });
  it('round-trips the user identifier through both mappers', () => {
    const now = new Date();
    const identity = AuthIdentityMapper.toPersistence({
      subjectId: 'user-id', provider: AuthProvider.EMAIL, providerSubject: 'a@example.com',
      passwordHash: 'hash', createdAt: now, updatedAt: now, lastAuthenticatedAt: null,
    }, 'identity-id');
    expect(identity.userId).toBe('user-id');
    expect(AuthIdentityMapper.toDomain(identity).subjectId).toBe('user-id');
    const session = SessionMapper.toPersistence({
      subjectId: 'user-id', identityId: 'identity-id', status: SessionStatus.ACTIVE,
      createdAt: now, lastActivityAt: now, expiresAt: new Date(now.getTime() + 60000),
      revokedAt: null, revocationReason: null,
    }, 'session-id');
    expect(session.userId).toBe('user-id');
    expect(SessionMapper.toDomain(session).toPrimitives().subjectId).toBe('user-id');
  });
});
