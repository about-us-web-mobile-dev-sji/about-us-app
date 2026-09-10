import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
export function accessToken(
  req: Request,
  transport?: 'WEB' | 'MOBILE',
): string {
  const cookie: unknown = req.cookies?.access_token;
  if (transport !== 'MOBILE' && typeof cookie === 'string' && cookie)
    return cookie;
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '');
  if (transport !== 'WEB' && match) return match[1];
  throw new UnauthorizedException('Access token is required');
}
export function verifyWebOrigin(req: Request, origin: string): void {
  if (
    req.get('origin') !== origin ||
    req.get('sec-fetch-site') === 'cross-site'
  )
    throw new ForbiddenException('Untrusted request origin');
}
