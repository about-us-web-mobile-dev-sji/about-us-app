import { DataSource } from 'typeorm';
import type { PasswordChangeGateway } from '../../application/gateways/i-password-change.gateway.js';
import { PasswordChangeConflictException } from '../../domain/exceptions/password-change-conflict.exception.js';
import { AuthProvider } from '../../domain/enums/auth-provider.enums.js';
import { SessionStatus } from '../../domain/enums/session-status.enums.js';
import { AuthIdentityEntity } from './typeorm/auth-identity.entity.js';
import { AuthSessionEntity } from './typeorm/auth-session.entity.js';

export class TypeormPasswordChangeGateway implements PasswordChangeGateway {
  constructor(private readonly source: DataSource) {}
  async change(
    input: Parameters<PasswordChangeGateway['change']>[0],
  ): Promise<void> {
    await this.source.transaction(async (manager) => {
      const now = Date.now();
      const result = await manager.update(
        AuthIdentityEntity,
        {
          id: input.identityId,
          userId: input.subjectId,
          provider: AuthProvider.EMAIL,
          passwordHash: input.expectedHash,
        },
        { passwordHash: input.passwordHash, updatedAt: now },
      );
      if (result.affected !== 1) throw new PasswordChangeConflictException();
      await manager.update(
        AuthSessionEntity,
        {
          userId: input.subjectId,
          status: SessionStatus.ACTIVE,
        },
        {
          status: SessionStatus.REVOKED,
          revokedAt: now,
          revocationReason: 'Password changed',
          refreshTokenHash: null,
        },
      );
    });
  }
}
