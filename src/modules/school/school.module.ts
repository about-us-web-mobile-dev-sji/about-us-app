import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { SchoolEntity } from './infrastructure/persistence/typeorm/school.entity.js';
import { SchoolMembershipEntity } from './infrastructure/persistence/typeorm/school-membership.entity.js';
import { TypeormSchoolRepository } from './infrastructure/persistence/typeorm-school.repository.js';
import { TypeormSchoolMembershipRepository } from './infrastructure/persistence/typeorm-school-membership.repository.js';
import { CreateSchoolUseCase } from './application/use-cases/commands/create-school/CreateSchool.js';
import { ReplaceSchoolAdministratorUseCase } from './application/use-cases/commands/replace-school-administrator/ReplaceSchoolAdministrator.js';
import { SchoolController } from './infrastructure/http/school.controller.js';
import { SCHOOL_REPOSITORY, type SchoolRepository } from './domain/repositories/i-school.repository.js';
import { SCHOOL_MEMBERSHIP_REPOSITORY, type SchoolMembershipRepository } from './domain/repositories/i-school-membership.repository.js';
import { UserModule } from '../user/user.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { APP_FILTER } from '@nestjs/core';
import { SchoolExceptionFilter } from './infrastructure/http/school-exception.filter.js';
import { USER_REPOSITORY, type UserRepository } from '../user/domain/repositories/i-user.repository.js';
import { UserEntity } from '../user/infrastructure/persistence/entity/user.entity.js';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([SchoolEntity, SchoolMembershipEntity, UserEntity]),
    UserModule,
    AuthModule,
  ],
  controllers: [SchoolController],
  providers: [
    {
      provide: SCHOOL_REPOSITORY,
      useFactory: (repo: Repository<SchoolEntity>) =>
        new TypeormSchoolRepository(repo),
      inject: [getRepositoryToken(SchoolEntity)],
    },
    {
      provide: SCHOOL_MEMBERSHIP_REPOSITORY,
      useFactory: (repo: Repository<SchoolMembershipEntity>) =>
        new TypeormSchoolMembershipRepository(repo),
      inject: [getRepositoryToken(SchoolMembershipEntity)],
    },
    {
      provide: CreateSchoolUseCase,
      useFactory: (schools: SchoolRepository) =>
        new CreateSchoolUseCase(schools),
      inject: [SCHOOL_REPOSITORY],
    },
    {
      provide: ReplaceSchoolAdministratorUseCase,
      useFactory: (
        schools: SchoolRepository,
        memberships: SchoolMembershipRepository,
        users: UserRepository,
      ) => new ReplaceSchoolAdministratorUseCase(schools, memberships, users),
      inject: [SCHOOL_REPOSITORY, SCHOOL_MEMBERSHIP_REPOSITORY, USER_REPOSITORY],
    },
    {
      provide: APP_FILTER,
      useClass: SchoolExceptionFilter,
    },
  ],
  exports: [CreateSchoolUseCase, ReplaceSchoolAdministratorUseCase],
})
export class SchoolModule {}
