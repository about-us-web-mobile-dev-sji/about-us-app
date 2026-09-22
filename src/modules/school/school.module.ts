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
import { ReplaceSchoolAdministratorUseCase } from './application/use-cases/commands/replace-school-administrator/ReplaceSchoolAdministrator.js';
import { ListSchoolsUseCase } from './application/use-cases/queries/list-schools/ListSchools.js';
import { ToggleSchoolStatus } from './application/use-cases/commands/toggle-school-status/ToggleSchoolStatus.js';
import { AcceptSchoolInvitation } from './application/use-cases/commands/accept-school-invitation/AcceptSchoolInvitation.js';
import { UpdateSchoolUseCase } from './application/use-cases/commands/update-school/UpdateSchool.js';
import { SchoolController } from './infrastructure/api/controllers/school.controller.js';
import {
  SCHOOL_REPOSITORY,
  type SchoolRepository,
} from './domain/repositories/i-school.repository.js';
import {
  SCHOOL_MEMBERSHIP_REPOSITORY,
  type SchoolMembershipRepository,
} from './domain/repositories/i-school-membership.repository.js';
import { UserModule } from '../user/user.module.js';
import { UserAccountService } from '../user/application/user-account.service.js';
import { MembershipEntity } from './infrastructure/persistence/typeorm/membership.entity.js';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([
      SchoolEntity,
      SchoolMembershipEntity,
      MembershipEntity,
    ]),
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
      provide: ReplaceSchoolAdministratorUseCase,
      useFactory: (
        schools: SchoolRepository,
        memberships: SchoolMembershipRepository,
        users: UserAccountService,
        emitter: EventEmitter2,
      ) =>
        new ReplaceSchoolAdministratorUseCase(
          schools,
          memberships,
          users,
          (event) => {
            emitter.emit('school.member-role.changed', event);
          },
        ),
      inject: [
        SCHOOL_REPOSITORY,
        SCHOOL_MEMBERSHIP_REPOSITORY,
        UserAccountService,
        EventEmitter2,
      ],
    },
    {
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
    },
    {
      provide: UpdateSchoolUseCase,
      useFactory: (schools: SchoolRepository) =>
        new UpdateSchoolUseCase(schools),
      inject: [SCHOOL_REPOSITORY],
    },
  ],
  exports: [
    CreateSchoolUseCase,
    ReplaceSchoolAdministratorUseCase,
    ListSchoolsUseCase,
    ToggleSchoolStatus,
    AcceptSchoolInvitation,
    UpdateSchoolUseCase,
  ],
})
export class SchoolModule {}