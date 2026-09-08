import { EmailLoginDto } from './dto/email-login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { AuthResponseMapper } from './mappers/auth-response.mapper.js';
import { EmailLoginUseCase } from '../../application/use-cases/commands/email-login/EmailLogin.js';
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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { GoogleLoginUseCase } from '../../application/use-cases/commands/google-login/GoogleLogin.js';
import { RefreshTokenUseCase } from '../../application/use-cases/commands/refresh-token/RefreshToken.js';
import { AuthenticateUseCase } from '../../application/use-cases/queries/authenticate/Authenticate.js';
import { LogoutUseCase } from '../../application/use-cases/commands/logout/Logout.js';
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
  async login(@Body() body: unknown, @Req() req: Request) {
    const dto = EmailLoginDto.parse(body);
    return AuthResponseMapper.token(
      await this.emailLogin.handle({
        email: dto.email,
        password: dto.password,
        userAgent: req.get('user-agent'),
      }),
    );
  }
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  google() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  async callback(@Req() req: Request) {
    return AuthResponseMapper.token(
      await this.googleLogin.handle({
        profile: req.user as GoogleIdentity,
        userAgent: req.get('user-agent'),
      }),
    );
  }
  @Post('refresh')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async refresh(@Body() body: unknown) {
    const dto = RefreshTokenDto.parse(body);
    return AuthResponseMapper.token(
      await this.refreshToken.handle({ refreshToken: dto.refreshToken }),
    );
  }
  @Get('me')
  @Header('Cache-Control', 'no-store')
  async me(@Req() req: Request) {
    return AuthResponseMapper.subject(
      await this.authenticate.handle({ accessToken: this.bearer(req) }),
    );
  }
  @Post('logout')
  @HttpCode(204)
  logout(@Req() req: Request) {
    return this.logoutUseCase.handle({ accessToken: this.bearer(req) });
  }
  private bearer(req: Request) {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '');
    if (!match) throw new UnauthorizedException('Bearer token is required');
    return match[1];
  }
}
