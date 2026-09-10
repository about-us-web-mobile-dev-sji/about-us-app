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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { EmailLoginUseCase } from '../../application/use-cases/commands/email-login/EmailLogin.js';
import { GoogleLoginUseCase } from '../../application/use-cases/commands/google-login/GoogleLogin.js';
import { RefreshTokenUseCase } from '../../application/use-cases/commands/refresh-token/RefreshToken.js';
import { LogoutUseCase } from '../../application/use-cases/commands/logout/Logout.js';
import type { GoogleIdentity } from '../../application/models/google-identity.js';
import { GoogleAuthGuard } from '../services/google-auth-guard.services.js';
import { EmailLoginDto } from './dto/email-login.dto.js';
import { accessToken, verifyWebOrigin } from './auth-transport.js';

@Controller('auth/web')
export class WebAuthController {

  constructor(
    @Inject(EmailLoginUseCase) private readonly email: EmailLoginUseCase,
    @Inject(GoogleLoginUseCase)
    private readonly googleLogin: GoogleLoginUseCase,
    @Inject(RefreshTokenUseCase)
    private readonly refreshSession: RefreshTokenUseCase,
    @Inject(LogoutUseCase) private readonly logoutSession: LogoutUseCase,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}


  private options(path: string) {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path,
    };
  }

  private attach(
    res: Response,
    result: { accessToken: string; refreshToken: string; expiresIn: number },
  ) {
    res.cookie('access_token', result.accessToken, {
      ...this.options('/'),
      maxAge: result.expiresIn * 1000,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...this.options('/auth/web'),
      maxAge: this.config.getOrThrow<number>('auth.sessionTtlSeconds') * 1000,
    });
  }


  private csrf(req: Request) {
    verifyWebOrigin(req, this.config.getOrThrow<string>('auth.webOrigin'));
  }


  @Post('login/email')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.csrf(req);
    const result = await this.email.handle({
      ...EmailLoginDto.parse(body),
      userAgent: req.get('user-agent'),
      clientType: 'WEB',
    });
    this.attach(res, result);
    return { user: result.user, sessionId: result.sessionId };
  }


  @Get('login/google')
  @UseGuards(GoogleAuthGuard)
  google() {}


  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  async callback(@Req() req: Request, @Res() res: Response) {
    const result = await this.googleLogin.handle({
      profile: req.user as GoogleIdentity,
      userAgent: req.get('user-agent'),
      clientType: 'WEB',
    });
    this.attach(res, result);
    res.redirect(this.config.getOrThrow<string>('auth.webCallbackUrl'));
  }

  
  @Post('refresh')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.csrf(req);
    const raw: unknown = req.cookies?.refresh_token;
    if (typeof raw !== 'string' || !raw)
      throw new UnauthorizedException('Refresh cookie is required');
    const result = await this.refreshSession.handle({
      refreshToken: raw,
      clientType: 'WEB',
    });
    this.attach(res, result);
    return { user: result.user, sessionId: result.sessionId };
  }
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.csrf(req);
    const refreshToken: unknown = req.cookies?.refresh_token;
    await this.logoutSession.handle(
      typeof refreshToken === 'string' && refreshToken
        ? { refreshToken, clientType: 'WEB' }
        : { accessToken: accessToken(req, 'WEB'), clientType: 'WEB' },
    );
    res.clearCookie('access_token', this.options('/'));
    res.clearCookie('refresh_token', this.options('/auth/web'));
  }
}
