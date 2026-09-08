import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { SqliteDatabase } from '../../shared/infrastructure/database/sqlite.database.js';
import {
  SUPER_ADMIN_EVENTS,
  type SuperAdminEventsGateway,
} from './application/gateways/i-super-admin-events.gateway.js';
import { InMemorySuperAdminEventsGateway } from './infrastructure/events/in-memory-super-admin-events.gateway.js';
import { UserAccountService } from './application/user-account.service.js';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './domain/repositories/i-user.repository.js';
import { PUserRepository } from './infrastructure/persistence/repositories/p-user.repository.js';
import { CreateSuperAdminUseCase } from './application/use-cases/create-super-admin/create-super-admin.usecase.js';
import { SuperAdminInitializer } from './infrastructure/startup/super-admin-initializer.js';

@Module({
  imports: [ConfigModule, DatabaseModule],
  exports: [UserAccountService, SUPER_ADMIN_EVENTS],
  providers: [
    { provide: SUPER_ADMIN_EVENTS, useClass: InMemorySuperAdminEventsGateway },
    {
      provide: UserAccountService,
      useFactory: (users: UserRepository) => new UserAccountService(users),
      inject: [USER_REPOSITORY],
    },
    {
      provide: USER_REPOSITORY,
      useFactory: (database: SqliteDatabase) => new PUserRepository(database),
      inject: [SqliteDatabase],
    },
    {
      provide: CreateSuperAdminUseCase,
      useFactory: (
        config: ConfigService,
        repository: UserRepository,
        events: SuperAdminEventsGateway,
      ) =>
        new CreateSuperAdminUseCase(
          {
            email: config.get<string>('super-admin.email'),
            firstName: config.get<string>('super-admin.firstName'),
            lastName: config.get<string>('super-admin.lastName'),
          },
          repository,
          events,
        ),
      inject: [ConfigService, USER_REPOSITORY, SUPER_ADMIN_EVENTS],
    },
    {
      provide: SuperAdminInitializer,
      useFactory: (useCase: CreateSuperAdminUseCase) =>
        new SuperAdminInitializer(useCase),
      inject: [CreateSuperAdminUseCase],
    },
  ],
})
export class UserModule {}
