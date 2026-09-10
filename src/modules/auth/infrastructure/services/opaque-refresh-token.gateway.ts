import { createHash, randomBytes } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { IsNull, MoreThan, Repository } from 'typeorm';
import type { RefreshTokenGateway } from '../../application/gateways/i-refresh-token.gateway.js';
import type { RefreshToken } from '../../domain/entities/refresh-token.js';
import { AuthSessionEntity } from '../persistence/typeorm/auth-session.entity.js';
import { SessionStatus } from '../../domain/enums/session-status.enums.js';

export class OpaqueRefreshTokenGateway implements RefreshTokenGateway {
  constructor(
    private readonly sessions: Repository<AuthSessionEntity>,
    private readonly issuer: string,
  ) {}

  private hash(raw: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(raw))
      throw new UnauthorizedException('Invalid refresh token');
    return createHash('sha256').update(raw).digest('hex');
  }

  async sign(token: RefreshToken) {
    const raw = randomBytes(32).toString('base64url');
    const result = await this.sessions.update(
      {
        id: token.toClaims().sid,
        refreshTokenHash: IsNull(),
        status: SessionStatus.ACTIVE,
        expiresAt: MoreThan(Date.now()),
      },
      { refreshTokenHash: this.hash(raw) },
    );
    if (result.affected !== 1)
      throw new UnauthorizedException('Session unavailable');
    return raw;
  }

  async verify(raw: string) {
    const session = await this.sessions.findOneBy({
      refreshTokenHash: this.hash(raw),
      status: SessionStatus.ACTIVE,
      expiresAt: MoreThan(Date.now()),
    });
    if (!session)
      throw new UnauthorizedException('Invalid or expired refresh token');
    return {
      tokenUse: 'refresh' as const,
      jti: this.hash(raw),
      sid: session.id,
      sub: session.userId,
      iss: this.issuer,
      iat: Math.floor(session.createdAt / 1000),
      exp: Math.floor(session.expiresAt / 1000),
    };
  }

  async rotate(raw: string) {
    const replacement = randomBytes(32).toString('base64url');
    // Compare-and-swap ensures only one concurrent request can consume a token.
    const result = await this.sessions.update(
      {
        refreshTokenHash: this.hash(raw),
        status: SessionStatus.ACTIVE,
        expiresAt: MoreThan(Date.now()),
      },
      { refreshTokenHash: this.hash(replacement) },
    );
    if (result.affected !== 1)
      throw new UnauthorizedException(
        'Refresh token already consumed or expired',
      );
    return replacement;
  }
}
