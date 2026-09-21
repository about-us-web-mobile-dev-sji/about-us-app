import { NotificationModule } from './modules/notification/notification.module.js';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './shared/infrastructure/database/database.module.js';
import { createObserveModule } from '@nestjs/observe';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SchoolModule } from './modules/school/school.module.js';
import superAdminConfig from './config/super-admin.config.js';
import databaseConfig from './config/data-base.config.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { EventModule } from './modules/event/event.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

const observeEnabled =
  process.env.OBSERVE_APP_KEY !== undefined &&
  process.env.OBSERVE_APP_SECRET !== undefined;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [superAdminConfig, databaseConfig],
    }),

    DatabaseModule,

    EventEmitterModule.forRoot(),

    UserModule,
    AuthModule,
    SchoolModule,
    EventModule,
    NotificationModule,

    ...(observeEnabled
      ? [
          ObserveModule.forRoot({
            appKey: process.env.OBSERVE_APP_KEY!,
            appSecret: process.env.OBSERVE_APP_SECRET!,
            serviceId: 'about-us',
          }),
        ]
      : []),
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
