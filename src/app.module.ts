import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './shared/infrastructure/database/database.module.js';
import { createObserveModule } from '@nestjs/observe';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import superAdminConfig from './config/super-admin.config.js';
import databaseConfig from './config/data-base.config.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { EventModule } from './modules/event/event.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

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
    EventModule,

    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'about-us',
    }),
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
