import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { USER_REPOSITORY, type UserRepository } from './domain/repositories/i-user.repository.js';
import { PUserRepository } from './infrastructure/persistence/repositories/p-user.repository.js';
import { CreateSuperAdminUseCase } from './application/use-cases/create-super-admin/create-super-admin.usecase.js';
import { SuperAdminInitializer } from './infrastructure/startup/super-admin-initializer.js';
import { UserController } from './infrastructure/api/controllers/user.controller.js';
import { UserPersistenceMapper } from './infrastructure/persistence/mappers/user.persistence.mapper.js';
import { ListUsers } from './application/use-cases/queries/list-users/list-users.js';
import { UpdateUserStatus } from './application/use-cases/command/update-user-status.js';

@Module({
  imports: [ConfigModule],
  controllers: [UserController],
  providers: [
    UserPersistenceMapper,
    ListUsers,
    UpdateUserStatus,
    {
      provide: USER_REPOSITORY,
      useFactory: (config: ConfigService, mapper: UserPersistenceMapper) =>
        new PUserRepository(config, mapper),
      inject: [ConfigService, UserPersistenceMapper],
    },
    {
      provide: CreateSuperAdminUseCase,
      useFactory: (config: ConfigService, repository: UserRepository) =>
        new CreateSuperAdminUseCase(config, repository),
      inject: [ConfigService, USER_REPOSITORY],
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
