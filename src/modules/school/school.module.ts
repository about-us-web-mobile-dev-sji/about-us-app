import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { SchoolEntity } from './infrastructure/persistence/typeorm/school.entity.js';
import { TypeormSchoolRepository } from './infrastructure/persistence/typeorm-school.repository.js';
import { CreateSchoolUseCase } from './application/use-cases/commands/create-school/CreateSchool.js';
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
      useFactory: (schools: SchoolRepository) =>
        new CreateSchoolUseCase(schools),
      inject: [SCHOOL_REPOSITORY],
    },
    {
      provide: APP_FILTER,
      useClass: SchoolExceptionFilter,
    },
  ],
  exports: [CreateSchoolUseCase],
})
export class SchoolModule {}
