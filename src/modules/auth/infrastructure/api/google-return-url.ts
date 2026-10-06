import type { Request, Response } from 'express';

import type { ConfigService } from '@nestjs/config';

const COOKIE = 'google_return_url';

/** Google callback path as seen by the browser (proxy prefix included). */
export function googleCallbackPath(config: ConfigService): string {
  return `${config.get<string>('auth.publicPathPrefix') ?? ''}/auth/web/google/callback`;
}

/** Same-app absolute path only (no "//host", "/\\host" or scheme). */
export function safeReturnUrl(value: unknown): string | null {
  return typeof value === 'string' &&
    value.length <= 2048 &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
    ? value
    : null;
}

/** Keeps the page to reopen after Google, for the duration of the OAuth round trip. */
export function rememberReturnUrl(
  req: Request,
  res: Response,
  options: { secure: boolean; path: string },
): void {
  const returnUrl = safeReturnUrl(req.query.returnUrl);
  if (!returnUrl) return;
  res.cookie(COOKIE, returnUrl, {
    httpOnly: true,
    secure: options.secure,
    sameSite: 'lax',
    path: options.path,
    maxAge: 300000,
  });
}

export function takeReturnUrl(req: Request, res: Response, path: string): string | null {
  const returnUrl = safeReturnUrl(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { path });
  return returnUrl;
}
