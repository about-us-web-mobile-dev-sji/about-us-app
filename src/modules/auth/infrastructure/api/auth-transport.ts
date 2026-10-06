import type { Request } from 'express';
import { AccessTokenRequiredException } from '../../domain/exceptions/access-token-required.exception.js';
import { UntrustedOriginException } from '../../domain/exceptions/untrusted-origin.exception.js';

export function accessToken(
  req: Request,
  transport?: 'WEB' | 'MOBILE',
): string {
  const cookie: unknown = req.cookies?.access_token;
  if (transport !== 'MOBILE' && typeof cookie === 'string' && cookie)
    return cookie;
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '');
  if (transport !== 'WEB' && match) return match[1];
  throw new AccessTokenRequiredException();
}

export function verifyWebOrigin(req: Request, origin: string): void {
  if (
    req.get('origin') !== origin ||
    req.get('sec-fetch-site') === 'cross-site'
  )
    throw new UntrustedOriginException();
}
