import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './infrastructure/configuration/database/database.module.js';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuditModule } from './audit/audit.module.js';
import { SchoolModule } from './school/school.module.js';
import { SchoolMembershipModule } from './school-membership/school-membership.module.js';
import { JwtAuthGuard } from './auth/infrastructure/guards/JwtAuthGuard.js';
import { RolesGuard } from './auth/infrastructure/guards/RolesGuard.js';
import { DataSource } from 'typeorm';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'about-us',
    }),
    DatabaseModule,
    UserModule,
    AuthModule,
    AuditModule,
    SchoolModule,
    SchoolMembershipModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: 'DataSource',
      useFactory: (dataSource: DataSource) => dataSource,
      inject: [DataSource],
    },
  ],
})
export class AppModule {}
