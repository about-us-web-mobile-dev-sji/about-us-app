import { Injectable, type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';
import { GoogleLoginFailedException } from '../../domain/exceptions/google-login-failed.exception.js';
import { rememberReturnUrl } from '../api/google-return-url.js';

export type GoogleCallbackRequest = Request & { googleAuthErrorCode?: string };

/**
 * The OAuth callback is a browser navigation: failures must not end on a JSON
 * page. They are recorded on the request and the handler redirects to the app.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest<TUser>(
    error: unknown,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser | null {
    if (!error && user) return user;
    context.switchToHttp().getRequest<GoogleCallbackRequest>().googleAuthErrorCode =
      error instanceof DomainException ? error.code : new GoogleLoginFailedException().code;
    return null;
  }
}

/** Entry point of the Google sign-in: remembers ?returnUrl before redirecting to Google. */
@Injectable()
export class GoogleLoginStartGuard extends GoogleAuthGuard {
  canActivate(context: ExecutionContext) {
    const http = context.switchToHttp();
    rememberReturnUrl(
      http.getRequest<Request>(),
      http.getResponse(),
      process.env.NODE_ENV === 'production',
    );
    return super.canActivate(context);
  }
}
