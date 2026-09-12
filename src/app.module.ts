import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './shared/infrastructure/database/database.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SchoolModule } from './modules/school/school.module.js';
import superAdminConfig from './config/super-admin.config.js';
import databaseConfig from './config/data-base.config.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { EventModule } from './modules/event/event.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [superAdminConfig, databaseConfig],
    }),

    DatabaseModule, // Activé pour PostgreSQL

    EventEmitterModule.forRoot(),

    UserModule,
    AuthModule,
    SchoolModule,
    EventModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}