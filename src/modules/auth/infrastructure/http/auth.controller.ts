import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';
@Controller('auth')
export class AuthController {
  @Get('me')
  @Header('Cache-Control', 'no-store')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return req.auth;
  }
}
