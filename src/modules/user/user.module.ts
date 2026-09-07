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
  imports: [ConfigModule],
  providers: [
    {
      provide: USER_REPOSITORY,
      useFactory: (config: ConfigService) => new PUserRepository(config),
      inject: [ConfigService],
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
