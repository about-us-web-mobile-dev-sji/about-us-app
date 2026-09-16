import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
} from '@nestjs/common';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../auth/infrastructure/api/guard/auth.guard.js';
import { verifyWebOrigin } from '../../../auth/infrastructure/api/auth-transport.js';
import { ConfigService } from '@nestjs/config';
import { ListNotifications } from '../../application/use-cases/queries/list-notifications/ListNotifications.js';
import { GetNotification } from '../../application/use-cases/queries/get-notification/GetNotification.js';
import { CountUnreadNotifications } from '../../application/use-cases/queries/count-unread-notifications/CountUnreadNotifications.js';
import { MarkNotificationRead } from '../../application/use-cases/commands/mark-notification-read/MarkNotificationRead.js';
import { ListNotificationsDto } from './dto/list-notifications.dto.js';
import type { UUID } from 'node:crypto';

@Controller('notifications')
@UseGuards(AuthGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class NotificationController {
  constructor(
    private readonly listNotifications: ListNotifications,
    private readonly getNotification: GetNotification,
    private readonly countUnread: CountUnreadNotifications,
    private readonly markRead: MarkNotificationRead,
    private readonly config: ConfigService,
  ) {}

  private mutation(req: AuthenticatedRequest) {
    if (req.cookies?.access_token) {
      verifyWebOrigin(req, this.config.getOrThrow<string>('auth.webOrigin'));
    }
  }

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListNotificationsDto,
  ) {
    return this.listNotifications.handle({
      recipientId: req.auth.subjectId,
      ...query,
    });
  }

  @Get('unread-count')
  async count(@Req() req: AuthenticatedRequest) {
    return { count: await this.countUnread.handle(req.auth.subjectId) };
  }

  @Patch('read-all')
  @HttpCode(204)
  async readAll(@Req() req: AuthenticatedRequest) {
    this.mutation(req);
    await this.markRead.handle({ recipientId: req.auth.subjectId });
  }

  @Get(':id')
  get(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: UUID,
  ) {
    return this.getNotification.handle(req.auth.subjectId, id);
  }

  @Patch(':id/read')
  @HttpCode(204)
  async read(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: UUID,
  ) {
    this.mutation(req);
    await this.markRead.handle({ recipientId: req.auth.subjectId, id });
  }
}
