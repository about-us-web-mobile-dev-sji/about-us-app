import {
  BadRequestException,
  Body,
  Controller,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { EmailLoginUseCase } from '../../application/use-cases/commands/email-login/EmailLogin.js';
import { GoogleLoginUseCase } from '../../application/use-cases/commands/google-login/GoogleLogin.js';
import { RefreshTokenUseCase } from '../../application/use-cases/commands/refresh-token/RefreshToken.js';
import { LogoutUseCase } from '../../application/use-cases/commands/logout/Logout.js';
import {
  GOOGLE_TOKEN_VERIFIER,
  type GoogleTokenVerifierGateway,
} from '../../application/gateways/i-google-token-verifier.gateway.js';
import { EmailLoginDto } from './dto/email-login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { accessToken } from './auth-transport.js';


@Controller('auth/mobile')
export class MobileAuthController {

  constructor(
    @Inject(EmailLoginUseCase) private readonly email: EmailLoginUseCase,
    @Inject(GoogleLoginUseCase) private readonly google: GoogleLoginUseCase,
    @Inject(RefreshTokenUseCase)
    private readonly refreshSession: RefreshTokenUseCase,
    @Inject(LogoutUseCase) private readonly logoutSession: LogoutUseCase,
    @Inject(GOOGLE_TOKEN_VERIFIER)
    private readonly verifier: GoogleTokenVerifierGateway,
  ) {}


  @Post('login/email')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  login(@Body() body: unknown, @Req() req: Request) {
    return this.email.handle({
      ...EmailLoginDto.parse(body),
      userAgent: req.get('user-agent'),
      clientType: 'MOBILE',
    });
  }


  @Post('login/google')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async loginGoogle(@Body() body: unknown, @Req() req: Request) {
    const idToken = (body as { idToken?: unknown } | null)?.idToken;
    if (typeof idToken !== 'string' || !idToken || idToken.length > 16384)
      throw new BadRequestException('idToken is required');
    return this.google.handle({
      profile: await this.verifier.verify(idToken),
      userAgent: req.get('user-agent'),
      clientType: 'MOBILE',
    });
  }
  

  @Post('refresh')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  refresh(@Body() body: unknown) {
    return this.refreshSession.handle({
      ...RefreshTokenDto.parse(body),
      clientType: 'MOBILE',
    });
  }


  @Post('logout')
  @HttpCode(204)
  logout(@Req() req: Request, @Body() body: unknown) {
    if (body && typeof body === 'object' && 'refreshToken' in body) {
      return this.logoutSession.handle({
        ...RefreshTokenDto.parse(body),
        clientType: 'MOBILE',
      });
    }
    return this.logoutSession.handle({
      accessToken: accessToken(req, 'MOBILE'),
      clientType: 'MOBILE',
    });
  }

}
