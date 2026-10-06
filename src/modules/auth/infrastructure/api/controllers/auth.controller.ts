import type { Request, Response } from 'express';
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
import { ChangePassword } from '../../../application/use-cases/commands/change-password/change-password.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { accessToken } from '../auth-transport.js';
import { AuthGuard, type AuthenticatedRequest } from '../guard/auth.guard.js';
import { WebSessionCookies } from '../web-session-cookies.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(ChangePassword)
    private readonly changePasswordUseCase: ChangePassword,
    @Inject(WebSessionCookies) private readonly cookies: WebSessionCookies,
  ) {}

  @Patch('password')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async changePassword(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const usesCookie = this.cookies.hasAccessToken(req);
    if (usesCookie) this.cookies.verifyOrigin(req);
    await this.changePasswordUseCase.handle({
      ...ChangePasswordDto.parse(body),
      accessToken: accessToken(req),
    });
    // Every session has been revoked: the web cookies are now useless.
    if (usesCookie) this.cookies.clear(res);
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return req.auth;
  }
}
