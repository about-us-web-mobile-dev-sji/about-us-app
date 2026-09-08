import { EmailLoginUseCase } from '../../application/use-cases/email-login.usecase.js';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { GoogleLoginUseCase } from '../../application/use-cases/google-login.usecase.js';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.usecase.js';
import { AuthenticateUseCase } from '../../application/use-cases/authenticate.usecase.js';
import { LogoutUseCase } from '../../application/use-cases/logout.usecase.js';
import type { GoogleIdentity } from '../../application/models/google-identity.js';
import { GoogleAuthGuard } from '../services/google-auth-guard.services.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(EmailLoginUseCase) private readonly emailLogin: EmailLoginUseCase,
    @Inject(GoogleLoginUseCase)
    private readonly googleLogin: GoogleLoginUseCase,
    @Inject(RefreshTokenUseCase)
    private readonly refreshToken: RefreshTokenUseCase,
    @Inject(AuthenticateUseCase)
    private readonly authenticate: AuthenticateUseCase,
    @Inject(LogoutUseCase) private readonly logoutUseCase: LogoutUseCase,
  ) {}
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  login(@Body() body: unknown, @Req() req: Request) {
    if (
      !body ||
      typeof body !== 'object' ||
      !('email' in body) ||
      typeof body.email !== 'string' ||
      !('password' in body) ||
      typeof body.password !== 'string' ||
      body.email.length > 320 ||
      body.password.length > 1024
    ) {
      throw new BadRequestException('email and password are required');
    }
    return this.emailLogin.handle({
      email: body.email,
      password: body.password,
      userAgent: req.get('user-agent'),
    });
  }
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  google() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  callback(@Req() req: Request) {
    return this.googleLogin.handle(
      req.user as GoogleIdentity,
      req.get('user-agent'),
    );
  }
  @Post('refresh')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  refresh(@Body() body: unknown) {
    if (
      !body ||
      typeof body !== 'object' ||
      !('refreshToken' in body) ||
      typeof body.refreshToken !== 'string' ||
      !body.refreshToken ||
      body.refreshToken.length > 8192
    )
      throw new BadRequestException('refreshToken is required');
    return this.refreshToken.handle(body.refreshToken);
  }
  @Get('me')
  @Header('Cache-Control', 'no-store')
  me(@Req() req: Request) {
    return this.authenticate.handle(this.bearer(req));
  }
  @Post('logout')
  @HttpCode(204)
  logout(@Req() req: Request) {
    return this.logoutUseCase.handle(this.bearer(req));
  }
  private bearer(req: Request) {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '');
    if (!match) throw new UnauthorizedException('Bearer token is required');
    return match[1];
  }
}
