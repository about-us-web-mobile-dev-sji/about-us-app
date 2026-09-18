import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from '../user/user.module.js';
import { UserAccountService } from '../user/application/user-account.service.js';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from './domain/repositories/i-notification.repository.js';
import { EMAIL_SENDER } from './application/gateways/i-email-sender.gateway.js';
import { NOTIFICATION_TEMPLATES } from './application/gateways/i-notification-templates.gateway.js';
import { SendNotification } from './application/use-cases/commands/send-notification/SendNotification.js';
import { MarkNotificationRead } from './application/use-cases/commands/mark-notification-read/MarkNotificationRead.js';
import { ListNotifications } from './application/use-cases/queries/list-notifications/ListNotifications.js';
import { GetNotification } from './application/use-cases/queries/get-notification/GetNotification.js';
import { CountUnreadNotifications } from './application/use-cases/queries/count-unread-notifications/CountUnreadNotifications.js';
import { NotificationEntity } from './infrastructure/persistence/typeorm/notification.entity.js';
import { TypeormNotificationRepository } from './infrastructure/persistence/typeorm-notification.repository.js';
import { CatalogNotificationTemplates } from './infrastructure/templates/notification-templates.js';
import { SmtpEmailSender } from './infrastructure/email/smtp-email-sender.js';
import { NotificationController } from './infrastructure/http/notification.controller.js';
import { NotificationListener } from './infrastructure/events/notification.listener.js';
import { NotificationExceptionFilter } from './infrastructure/http/notification-exception.filter.js';
import {
  NOTIFICATION_CONFIG,
  notificationConfig,
  type NotificationConfig,
} from './infrastructure/notification.config.js';

const logger = new Logger('Notifications');

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    TypeOrmModule.forFeature([NotificationEntity]),
    AuthModule,
    UserModule,
  ],
  controllers: [NotificationController],
  providers: [
    { provide: APP_FILTER, useClass: NotificationExceptionFilter },
    { provide: NOTIFICATION_CONFIG, useFactory: () => notificationConfig() },
    {
      provide: NOTIFICATION_REPOSITORY,
      useFactory: (repo: Repository<NotificationEntity>) =>
        new TypeormNotificationRepository(repo),
      inject: [getRepositoryToken(NotificationEntity)],
    },
    {
      provide: NOTIFICATION_TEMPLATES,
      inject: [NOTIFICATION_CONFIG],
      useFactory: (config: NotificationConfig) =>
        new CatalogNotificationTemplates(config.defaultLocale),
    },
    {
      provide: EMAIL_SENDER,
      inject: [NOTIFICATION_CONFIG],
      useFactory: (config: NotificationConfig) => new SmtpEmailSender(config),
    },
    {
      provide: SendNotification,
      inject: [
        NOTIFICATION_REPOSITORY,
        UserAccountService,
        NOTIFICATION_TEMPLATES,
        EMAIL_SENDER,
        NOTIFICATION_CONFIG,
      ],
      useFactory: (
        notifications: NotificationRepository,
        users: UserAccountService,
        templates: CatalogNotificationTemplates,
        email: SmtpEmailSender,
        config: NotificationConfig,
      ) =>
        new SendNotification(notifications, users, templates, email, config, (fields) =>
          logger.error(fields),
        ),
    },
    {
      provide: ListNotifications,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (notifications: NotificationRepository) =>
        new ListNotifications(notifications),
    },
    {
      provide: GetNotification,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (notifications: NotificationRepository) =>
        new GetNotification(notifications),
    },
    {
      provide: CountUnreadNotifications,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (notifications: NotificationRepository) =>
        new CountUnreadNotifications(notifications),
    },
    {
      provide: MarkNotificationRead,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (notifications: NotificationRepository) =>
        new MarkNotificationRead(notifications),
    },
    NotificationListener,
  ],
  exports: [SendNotification],
})
export class NotificationModule {}
