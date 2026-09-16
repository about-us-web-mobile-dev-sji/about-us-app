import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ChangePassword } from '../../../application/use-cases/commands/change-password/change-password.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { accessToken, verifyWebOrigin } from '../auth-transport.js';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Patch,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../guard/auth.guard.js';
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(ChangePassword)
    private readonly changePasswordUseCase: ChangePassword,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Patch('password')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async changePassword(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const usesCookie =
      typeof req.cookies?.access_token === 'string' &&
      !!req.cookies.access_token;
    if (usesCookie)
      verifyWebOrigin(req, this.config.getOrThrow<string>('auth.webOrigin'));
    const token = accessToken(req);
    await this.changePasswordUseCase.handle({
      ...ChangePasswordDto.parse(body),
      accessToken: token,
    });
    if (usesCookie) {
      const options = {
        httpOnly: true,
        secure: this.config.get('NODE_ENV') === 'production',
        sameSite: 'lax' as const,
      };
      res.clearCookie('access_token', { ...options, path: '/' });
      res.clearCookie('refresh_token', { ...options, path: '/auth/web' });
    }
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return req.auth;
  }
}
