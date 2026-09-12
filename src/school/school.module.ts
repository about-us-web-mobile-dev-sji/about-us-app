import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolPersistenceModel } from './infrastructure/persistence/entities/SchoolPersistenceModel.js';
import { TypeOrmSchoolRepository } from './infrastructure/persistence/repositories/TypeOrmSchoolRepository.js';
import { SchoolRepository } from './domain/repositories/SchoolRepository.js';
import { CreateSchool } from './application/use-cases/commands/create-school/CreateSchool.js';
import { FindSchoolById } from './application/use-cases/queries/find-school-by-id/FindSchoolById.js';
import { ListSchools } from './application/use-cases/queries/list-schools/ListSchools.js';
import { SchoolController } from './infrastructure/api/controllers/SchoolController.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SchoolPersistenceModel]),
    AuditModule,
    AuthModule,
  ],
  providers: [
    {
      provide: 'SchoolRepository',
      useClass: TypeOrmSchoolRepository,
    },
    {
      provide: SchoolRepository,
      useExisting: 'SchoolRepository',
    },
    CreateSchool,
    FindSchoolById,
    ListSchools,
  ],
  controllers: [SchoolController],
  exports: ['SchoolRepository', SchoolRepository],
})
export class SchoolModule {}
