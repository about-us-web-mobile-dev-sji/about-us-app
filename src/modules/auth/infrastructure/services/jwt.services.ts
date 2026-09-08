import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenGateway } from '../../application/gateways/i-access-token.gateway.js';
import type { RefreshTokenGateway } from '../../application/gateways/i-refresh-token.gateway.js';
import type { AccessToken } from '../../domain/entities/access-token.js';
import type { RefreshToken } from '../../domain/entities/refresh-token.js';

async function verify<T extends 'access' | 'refresh'>(
  jwt: JwtService,
  rawToken: string,
  tokenUse: T,
) {
  try {
    const claims = await jwt.verifyAsync<Record<string, unknown>>(rawToken);
    if (
      claims.tokenUse !== tokenUse ||
      !['jti', 'sub', 'sid', 'iss'].every(
        (key) =>
          typeof claims[key] === 'string' &&
          (claims[key] as string).trim().length > 0,
      ) ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp) ||
      (claims.exp as number) <= (claims.iat as number)
    )
      throw new Error('Invalid claims');
    return claims as {
      tokenUse: T;
      jti: string;
      sub: string;
      sid: string;
      iss: string;
      iat: number;
      exp: number;
    };
  } catch {
    throw new UnauthorizedException('Invalid or expired token');
  }
}
export class NestJwtService implements AccessTokenGateway {
  constructor(private readonly jwtService: JwtService) {}
  sign(token: AccessToken) {
    return this.jwtService.signAsync(token.toClaims());
  }
  verify(rawToken: string) {
    return verify(this.jwtService, rawToken, 'access');
  }
}
export class NestRefreshJwtService implements RefreshTokenGateway {
  constructor(private readonly jwtService: JwtService) {}
  sign(token: RefreshToken) {
    return this.jwtService.signAsync(token.toClaims());
  }
  verify(rawToken: string) {
    return verify(this.jwtService, rawToken, 'refresh');
  }
}
