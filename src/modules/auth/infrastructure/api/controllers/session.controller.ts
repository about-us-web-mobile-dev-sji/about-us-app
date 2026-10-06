import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ListSessionsUseCase } from '../../../application/use-cases/queries/list-sessions/ListSessions.js';
import { RevokeSessionUseCase } from '../../../application/use-cases/commands/revoke-session/RevokeSession.js';
import { RevokeAllSessionsUseCase } from '../../../application/use-cases/commands/revoke-all-sessions/RevokeAllSessions.js';
import { AuthGuard, type AuthenticatedRequest } from '../guard/auth.guard.js';
import { WebSessionCookies } from '../web-session-cookies.js';
import { toSessionResponse } from '../dto/session-response.dto.js';

/** UC-21 / UC-22: the signed-in user manages their own sessions (devices). */
@Controller('auth/sessions')
@UseGuards(AuthGuard)
export class SessionController {
  constructor(
    @Inject(ListSessionsUseCase) private readonly listSessions: ListSessionsUseCase,
    @Inject(RevokeSessionUseCase) private readonly revokeSession: RevokeSessionUseCase,
    @Inject(RevokeAllSessionsUseCase)
    private readonly revokeAllSessions: RevokeAllSessionsUseCase,
    @Inject(WebSessionCookies) private readonly cookies: WebSessionCookies,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() req: AuthenticatedRequest) {
    const sessions = await this.listSessions.handle({
      subjectId: req.auth.subjectId,
      currentSessionId: req.auth.sessionId,
    });
    return sessions.map(toSessionResponse);
  }

  @Delete(':sessionId')
  @HttpCode(204)
  async revoke(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (this.cookies.hasAccessToken(req)) this.cookies.verifyOrigin(req);
    const { revokedCurrent } = await this.revokeSession.handle({
      subjectId: req.auth.subjectId,
      currentSessionId: req.auth.sessionId,
      sessionId,
    });
    if (revokedCurrent) this.cookies.clear(res);
  }

  @Delete()
  @HttpCode(204)
  async revokeAll(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (this.cookies.hasAccessToken(req)) this.cookies.verifyOrigin(req);
    await this.revokeAllSessions.handle({ subjectId: req.auth.subjectId });
    this.cookies.clear(res);
  }
}
