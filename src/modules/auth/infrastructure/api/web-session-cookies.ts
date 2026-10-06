import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { verifyWebOrigin } from './auth-transport.js';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

/** Single owner of the web session cookies (names, paths, flags, lifetimes). */
@Injectable()
export class WebSessionCookies {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  /** As seen by the browser, so the cookie is also sent through a proxy prefix. */
  private get refreshPath(): string {
    return `${this.config.get<string>('auth.publicPathPrefix') ?? ''}/auth/web`;
  }

  private options(path: string) {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path,
    };
  }

  attach(
    res: Response,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  ): void {
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...this.options('/'),
      maxAge: tokens.expiresIn * 1000,
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.options(this.refreshPath),
      maxAge: this.config.getOrThrow<number>('auth.sessionTtlSeconds') * 1000,
    });
  }

  clear(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, this.options('/'));
    res.clearCookie(REFRESH_COOKIE, this.options(this.refreshPath));
  }

  hasAccessToken(req: Request): boolean {
    const raw: unknown = req.cookies?.[ACCESS_COOKIE];
    return typeof raw === 'string' && !!raw;
  }

  refreshToken(req: Request): string | null {
    const raw: unknown = req.cookies?.[REFRESH_COOKIE];
    return typeof raw === 'string' && raw ? raw : null;
  }

  /** CSRF protection for cookie-authenticated requests. */
  verifyOrigin(req: Request): void {
    verifyWebOrigin(req, this.config.getOrThrow<string>('auth.webOrigin'));
  }
}
