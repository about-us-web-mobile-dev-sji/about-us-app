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
<<<<<<< HEAD
import { SchoolModule } from './modules/school/school.module.js';
=======
>>>>>>> bf2f89ad25a959748ed2b806f2f111311ee8bd5a
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
    SchoolModule,
    EventModule,
<<<<<<< HEAD
=======
    SchoolModule,
>>>>>>> bf2f89ad25a959748ed2b806f2f111311ee8bd5a

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