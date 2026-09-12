import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { SchoolEntity } from './infrastructure/persistence/typeorm/school.entity.js';
import { TypeormSchoolRepository } from './infrastructure/persistence/typeorm-school.repository.js';
import { CreateSchoolUseCase } from './application/use-cases/commands/create-school/CreateSchool.js';
import { ToggleSchoolStatus } from './application/use-cases/commands/toggle-school-status/ToggleSchoolStatus.js';
import { AcceptSchoolInvitation } from './application/use-cases/commands/accept-school-invitation/AcceptSchoolInvitation.js';
import { SchoolController } from './infrastructure/http/school.controller.js';
import { SCHOOL_REPOSITORY, type SchoolRepository } from './domain/repositories/i-school.repository.js';
import { APP_FILTER } from '@nestjs/core';
import { SchoolExceptionFilter } from './infrastructure/http/school-exception.filter.js';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([SchoolEntity]),
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
      provide: AcceptSchoolInvitation,
      useFactory: (schools: SchoolRepository, eventEmitter: EventEmitter2) =>
        new AcceptSchoolInvitation(schools, eventEmitter),
      inject: [SCHOOL_REPOSITORY, EventEmitter2],
    },
    {
      provide: APP_FILTER,
      useClass: SchoolExceptionFilter,
    },
  ],
  exports: [CreateSchoolUseCase],
})
export class SchoolModule {}