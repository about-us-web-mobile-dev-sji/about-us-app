import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPersistenceModel } from './infrastructure/persistence/entities/UserPersistenceModel.js';
import { TypeOrmUserRepository } from './infrastructure/persistence/repositories/TypeOrmUserRepository.js';
import { UserRepository } from './domain/repositories/UserRepository.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserPersistenceModel])],
  providers: [
    {
      provide: 'UserRepository',
      useClass: TypeOrmUserRepository,
    },
    {
      provide: UserRepository,
      useExisting: 'UserRepository',
    },
  ],
  exports: ['UserRepository', UserRepository],
})
export class UserModule {}
