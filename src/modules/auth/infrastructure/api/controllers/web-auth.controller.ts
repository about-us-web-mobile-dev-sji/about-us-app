import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { EmailLoginUseCase } from '../../../application/use-cases/commands/email-login/EmailLogin.js';
import { GoogleLoginUseCase } from '../../../application/use-cases/commands/google-login/GoogleLogin.js';
import { RefreshTokenUseCase } from '../../../application/use-cases/commands/refresh-token/RefreshToken.js';
import { LogoutUseCase } from '../../../application/use-cases/commands/logout/Logout.js';
import type { GoogleIdentity } from '../../../application/models/google-identity.js';
import { RefreshTokenRequiredException } from '../../../domain/exceptions/refresh-token-required.exception.js';
import {
  GoogleAuthGuard,
  GoogleLoginStartGuard,
  type GoogleCallbackRequest,
} from '../../services/google-auth-guard.services.js';
import { DomainException } from '../../../../../shared/domain/exceptions/domain.exception.js';
import { googleCallbackPath, takeReturnUrl } from '../google-return-url.js';
import { EmailLoginDto } from '../dto/email-login.dto.js';
import { toWebSessionResponse } from '../mappers/auth-response.mapper.js';
import { accessToken } from '../auth-transport.js';
import { WebSessionCookies } from '../web-session-cookies.js';

@Controller('auth/web')
export class WebAuthController {
  constructor(
    @Inject(EmailLoginUseCase) private readonly email: EmailLoginUseCase,
    @Inject(GoogleLoginUseCase)
    private readonly googleLogin: GoogleLoginUseCase,
    @Inject(RefreshTokenUseCase)
    private readonly refreshSession: RefreshTokenUseCase,
    @Inject(LogoutUseCase) private readonly logoutSession: LogoutUseCase,
    @Inject(WebSessionCookies) private readonly cookies: WebSessionCookies,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Post('login/email')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.cookies.verifyOrigin(req);
    const result = await this.email.handle({
      ...EmailLoginDto.parse(body),
      userAgent: req.get('user-agent'),
      clientType: 'WEB',
    });
    this.cookies.attach(res, result);
    return toWebSessionResponse(result);
  }

  /** UC-25: redirects to Google; accepts ?returnUrl=/page to reopen afterwards. */
  @Get('login/google')
  @UseGuards(GoogleLoginStartGuard)
  google() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  async callback(@Req() req: GoogleCallbackRequest, @Res() res: Response) {
    const target = new URL(this.config.getOrThrow<string>('auth.webCallbackUrl'));
    const returnUrl = takeReturnUrl(req, res, googleCallbackPath(this.config));
    try {
      if (req.googleAuthErrorCode) {
        target.searchParams.set('error', req.googleAuthErrorCode);
      } else {
        const result = await this.googleLogin.handle({
          profile: req.user as GoogleIdentity,
          userAgent: req.get('user-agent'),
          clientType: 'WEB',
        });
        this.cookies.attach(res, result);
        if (returnUrl) target.searchParams.set('returnUrl', returnUrl);
      }
    } catch (error) {
      // A browser navigation: hand the error code to the app instead of a JSON page.
      if (!(error instanceof DomainException)) throw error;
      target.searchParams.set('error', error.code);
    }
    res.redirect(target.href);
  }

  @Post('refresh')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.cookies.verifyOrigin(req);
    const refreshToken = this.cookies.refreshToken(req);
    if (!refreshToken) throw new RefreshTokenRequiredException();
    try {
      const result = await this.refreshSession.handle({
        refreshToken,
        clientType: 'WEB',
      });
      this.cookies.attach(res, result);
      return toWebSessionResponse(result);
    } catch (error) {
      // A refresh that fails leaves no usable session: drop the stale cookies.
      this.cookies.clear(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.cookies.verifyOrigin(req);
    const refreshToken = this.cookies.refreshToken(req);
    try {
      await this.logoutSession.handle(
        refreshToken
          ? { refreshToken, clientType: 'WEB' }
          : { accessToken: accessToken(req, 'WEB'), clientType: 'WEB' },
      );
    } finally {
      this.cookies.clear(res);
    }
  }
}
