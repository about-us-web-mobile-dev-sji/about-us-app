import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SchoolEntity } from './infrastructure/persistence/typeorm/school.entity.js';
import { SchoolMembershipEntity } from './infrastructure/persistence/typeorm/school-membership.entity.js';
import { TypeormSchoolRepository } from './infrastructure/persistence/typeorm-school.repository.js';
import { TypeormSchoolMembershipRepository } from './infrastructure/persistence/typeorm-school-membership.repository.js';
import { CreateSchoolUseCase } from './application/use-cases/commands/create-school/CreateSchool.js';
<<<<<<< HEAD
import { ReplaceSchoolAdministratorUseCase } from './application/use-cases/commands/replace-school-administrator/ReplaceSchoolAdministrator.js';
=======
import { ListSchoolsUseCase } from './application/use-cases/queries/list-schools/ListSchools.js';
import { ToggleSchoolStatus } from './application/use-cases/commands/toggle-school-status/ToggleSchoolStatus.js';
import { AcceptSchoolInvitation } from './application/use-cases/commands/accept-school-invitation/AcceptSchoolInvitation.js';
>>>>>>> bf2f89ad25a959748ed2b806f2f111311ee8bd5a
import { SchoolController } from './infrastructure/http/school.controller.js';
import { SCHOOL_REPOSITORY, type SchoolRepository } from './domain/repositories/i-school.repository.js';
import { SCHOOL_MEMBERSHIP_REPOSITORY, type SchoolMembershipRepository } from './domain/repositories/i-school-membership.repository.js';
import { UserModule } from '../user/user.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { APP_FILTER } from '@nestjs/core';
import { SchoolExceptionFilter } from './infrastructure/http/school-exception.filter.js';
<<<<<<< HEAD
import { USER_REPOSITORY, type UserRepository } from '../user/domain/repositories/i-user.repository.js';
import { UserEntity } from '../user/infrastructure/persistence/entity/user.entity.js';
=======
import { MembershipEntity } from './infrastructure/persistence/typeorm/membership.entity.js';
>>>>>>> bf2f89ad25a959748ed2b806f2f111311ee8bd5a

@Module({
  imports: [
    DatabaseModule,
<<<<<<< HEAD
    TypeOrmModule.forFeature([SchoolEntity, SchoolMembershipEntity, UserEntity]),
    UserModule,
    AuthModule,
=======
    AuthModule,
    TypeOrmModule.forFeature([SchoolEntity, MembershipEntity]),
>>>>>>> bf2f89ad25a959748ed2b806f2f111311ee8bd5a
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
      useFactory: (schools: SchoolRepository, eventEmitter: EventEmitter2) =>
        new CreateSchoolUseCase(schools, eventEmitter),
      inject: [SCHOOL_REPOSITORY, EventEmitter2],
    },
    {
      provide: ToggleSchoolStatus,
      useFactory: (schools: SchoolRepository) =>
        new ToggleSchoolStatus(schools),
      inject: [SCHOOL_REPOSITORY],
    },
    {
<<<<<<< HEAD
      provide: ReplaceSchoolAdministratorUseCase,
      useFactory: (
        schools: SchoolRepository,
        memberships: SchoolMembershipRepository,
        users: UserRepository,
      ) => new ReplaceSchoolAdministratorUseCase(schools, memberships, users),
      inject: [SCHOOL_REPOSITORY, SCHOOL_MEMBERSHIP_REPOSITORY, USER_REPOSITORY],
=======
      provide: ListSchoolsUseCase,
      useFactory: (schools: SchoolRepository) =>
        new ListSchoolsUseCase(schools),
      inject: [SCHOOL_REPOSITORY],
    },
    {
      provide: AcceptSchoolInvitation,
      useFactory: (schools: SchoolRepository, eventEmitter: EventEmitter2) =>
        new AcceptSchoolInvitation(schools, eventEmitter),
      inject: [SCHOOL_REPOSITORY, EventEmitter2],
>>>>>>> bf2f89ad25a959748ed2b806f2f111311ee8bd5a
    },
    {
      provide: APP_FILTER,
      useClass: SchoolExceptionFilter,
    },
  ],
  exports: [CreateSchoolUseCase, ReplaceSchoolAdministratorUseCase],
})
export class SchoolModule {}