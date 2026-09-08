import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { APP_FILTER } from '@nestjs/core';
import { UserExceptionFilter } from './infrastructure/http/user-exception.filter.js';
import { TypeormUserRepository } from './infrastructure/persistence/typeorm-user.repository.js';
import {
  SUPER_ADMIN_EVENTS,
  type SuperAdminEventsGateway,
} from './application/gateway/super-admin-events.gateway.js';
import { NestSuperAdminEventsGateway } from './infrastructure/events/nest-super-admin-events.gateway.js';
import { UserEntity } from './infrastructure/persistence/typeorm/user.entity.js';
import {
  EventEmitterReadinessWatcher,
  EventEmitter2,
} from '@nestjs/event-emitter';
import { UserAccountService } from './application/user-account.service.js';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './domain/repositories/i-user.repository.js';
// PUserRepository removed: replaced by TypeORM-backed repository
import { CreateSuperAdminUseCase } from './application/use-cases/commands/create-super-admin/CreateSuperAdmin.js';
import { SuperAdminInitializer } from './infrastructure/startup/super-admin-initializer.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    TypeOrmModule.forFeature([UserEntity]),
  ],
  exports: [UserAccountService],
  providers: [
    { provide: APP_FILTER, useClass: UserExceptionFilter },
    {
      provide: SUPER_ADMIN_EVENTS,
      useFactory: (emitter: EventEmitter2) =>
        new NestSuperAdminEventsGateway(emitter),
      inject: [EventEmitter2],
    },
    {
      provide: CreateSuperAdminUseCase,
      useFactory: (
        repository: UserRepository,
        emitter: SuperAdminEventsGateway,
      ) => new CreateSuperAdminUseCase(repository, emitter),
      inject: [USER_REPOSITORY, SUPER_ADMIN_EVENTS],
    },
    {
      provide: UserAccountService,
      useFactory: (users: UserRepository) => new UserAccountService(users),
      inject: [USER_REPOSITORY],
    },
    {
      provide: USER_REPOSITORY,
      useFactory: (repo: Repository<UserEntity>) =>
        new TypeormUserRepository(repo),
      inject: [getRepositoryToken(UserEntity)],
    },

    {
      provide: SuperAdminInitializer,
      useFactory: (
        useCase: CreateSuperAdminUseCase,
        readiness: EventEmitterReadinessWatcher,
        config: ConfigService,
      ) =>
        new SuperAdminInitializer(useCase, readiness, {
          email: config.get<string>('super-admin.email'),
          firstName: config.get<string>('super-admin.firstName'),
          lastName: config.get<string>('super-admin.lastName'),
        }),
      inject: [
        CreateSuperAdminUseCase,
        EventEmitterReadinessWatcher,
        ConfigService,
      ],
    },
  ],
})
export class UserModule {}
