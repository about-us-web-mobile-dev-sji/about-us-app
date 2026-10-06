import type { Request, Response } from 'express';

const COOKIE = 'google_return_url';
const CALLBACK_PATH = '/auth/web/google/callback';

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
export function rememberReturnUrl(req: Request, res: Response, secure: boolean): void {
  const returnUrl = safeReturnUrl(req.query.returnUrl);
  if (!returnUrl) return;
  res.cookie(COOKIE, returnUrl, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: CALLBACK_PATH,
    maxAge: 300000,
  });
}

export function takeReturnUrl(req: Request, res: Response): string | null {
  const returnUrl = safeReturnUrl(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { path: CALLBACK_PATH });
  return returnUrl;
}
