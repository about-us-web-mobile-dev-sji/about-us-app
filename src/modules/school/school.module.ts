import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from '../user/user.module.js';
import { UserAccountService } from '../user/application/user-account.service.js';
import { SchoolEntity } from './infrastructure/persistence/typeorm/school.entity.js';
import { SchoolMembershipEntity } from './infrastructure/persistence/typeorm/school-membership.entity.js';
import { SchoolInvitationEntity } from './infrastructure/persistence/typeorm/school-invitation.entity.js';
import { SchoolRoleEntity } from './infrastructure/persistence/typeorm/school-role.entity.js';
import { PermissionEntity } from './infrastructure/persistence/typeorm/permission.entity.js';
import { TypeormSchoolRepository } from './infrastructure/persistence/typeorm-school.repository.js';
import { TypeormSchoolMembershipRepository } from './infrastructure/persistence/typeorm-school-membership.repository.js';
import { TypeormSchoolInvitationRepository } from './infrastructure/persistence/typeorm-school-invitation.repository.js';
import { TypeormSchoolRoleRepository } from './infrastructure/persistence/typeorm-school-role.repository.js';
import { SCHOOL_REPOSITORY, type SchoolRepository } from './domain/repositories/i-school.repository.js';
import { SCHOOL_MEMBERSHIP_REPOSITORY, type SchoolMembershipRepository } from './domain/repositories/i-school-membership.repository.js';
import { SCHOOL_INVITATION_REPOSITORY, type SchoolInvitationRepository } from './domain/repositories/i-school-invitation.repository.js';
import { SCHOOL_ROLE_REPOSITORY, type SchoolRoleRepository } from './domain/repositories/i-school-role.repository.js';
import { SchoolAuthorizationService } from './application/services/school-authorization.service.js';
import { SchoolRoleBootstrap } from './application/services/school-role-bootstrap.js';
import { CreateSchoolUseCase } from './application/use-cases/commands/create-school/create-school.js';
import { UpdateSchoolUseCase } from './application/use-cases/commands/update-school/update-school.js';
import { ToggleSchoolStatus } from './application/use-cases/commands/toggle-school-status/toggle-school-status.js';
import { ReplaceSchoolAdministratorUseCase } from './application/use-cases/commands/replace-school-administrator/replace-school-administrator.js';
import { InviteSchoolMemberUseCase } from './application/use-cases/commands/invite-school-member/invite-school-member.js';
import { AcceptSchoolInvitation } from './application/use-cases/commands/accept-school-invitation/accept-school-invitation.js';
import { SuspendSchoolMemberUseCase } from './application/use-cases/commands/suspend-school-member/suspend-school-member.js';
import { CancelSchoolMemberSuspensionUseCase } from './application/use-cases/commands/cancel-school-member-suspension/cancel-school-member-suspension.js';
import { RevokeSchoolMemberUseCase } from './application/use-cases/commands/revoke-school-member/revoke-school-member.js';
import { CreateSchoolRoleUseCase } from './application/use-cases/commands/create-school-role/create-school-role.js';
import { UpdateSchoolRoleUseCase } from './application/use-cases/commands/update-school-role/update-school-role.js';
import { DeleteSchoolRoleUseCase } from './application/use-cases/commands/delete-school-role/delete-school-role.js';
import { AssignSchoolMemberRoleUseCase } from './application/use-cases/commands/assign-school-member-role/assign-school-member-role.js';
import { RemoveSchoolMemberRoleUseCase } from './application/use-cases/commands/remove-school-member-role/remove-school-member-role.js';
import { ListSchoolsUseCase } from './application/use-cases/queries/list-schools/list-schools.js';
import { ListSchoolMembersUseCase } from './application/use-cases/queries/list-school-members/list-school-members.js';
import { ListSchoolRolesUseCase } from './application/use-cases/queries/list-school-roles/list-school-roles.js';
import { SchoolController } from './infrastructure/api/controllers/school.controller.js';
import { SchoolAdministrationController } from './infrastructure/api/controllers/school-administration.controller.js';
import { SchoolInvitationController } from './infrastructure/api/controllers/school-invitation.controller.js';
import { SchoolMemberController } from './infrastructure/api/controllers/school-member.controller.js';
import { SchoolRoleController } from './infrastructure/api/controllers/school-role.controller.js';
import { SpacesModule } from '../spaces/spaces.module.js';
import {
  SPACE_REPOSITORY,
  type SpaceRepository,
} from '../spaces/domain/repositories/i-space.repository.js';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([
      SchoolEntity,
      SchoolMembershipEntity,
      SchoolInvitationEntity,
      SchoolRoleEntity,
      PermissionEntity,
    ]),
    UserModule,
    AuthModule,
    SpacesModule,
  ],
  controllers: [
    SchoolController,
    SchoolAdministrationController,
    SchoolInvitationController,
    SchoolMemberController,
    SchoolRoleController,
  ],
  providers: [
    {
      provide: SCHOOL_REPOSITORY,
      useFactory: (repo: Repository<SchoolEntity>) => new TypeormSchoolRepository(repo),
      inject: [getRepositoryToken(SchoolEntity)],
    },
    {
      provide: SCHOOL_MEMBERSHIP_REPOSITORY,
      useFactory: (repo: Repository<SchoolMembershipEntity>) => new TypeormSchoolMembershipRepository(repo),
      inject: [getRepositoryToken(SchoolMembershipEntity)],
    },
    {
      provide: SCHOOL_INVITATION_REPOSITORY,
      useFactory: (repo: Repository<SchoolInvitationEntity>) => new TypeormSchoolInvitationRepository(repo),
      inject: [getRepositoryToken(SchoolInvitationEntity)],
    },
    {
      provide: SCHOOL_ROLE_REPOSITORY,
      useFactory: (repo: Repository<SchoolRoleEntity>) => new TypeormSchoolRoleRepository(repo),
      inject: [getRepositoryToken(SchoolRoleEntity)],
    },
    {
      provide: SchoolRoleBootstrap,
      useFactory: (schools: SchoolRepository, roles: SchoolRoleRepository) => new SchoolRoleBootstrap(schools, roles),
      inject: [SCHOOL_REPOSITORY, SCHOOL_ROLE_REPOSITORY],
    },
    {
      provide: SchoolAuthorizationService,
      useFactory: (
        memberships: SchoolMembershipRepository,
        roles: SchoolRoleRepository,
        schools: SchoolRepository,
      ) => new SchoolAuthorizationService(memberships, roles, schools),
      inject: [SCHOOL_MEMBERSHIP_REPOSITORY, SCHOOL_ROLE_REPOSITORY, SCHOOL_REPOSITORY],
    },

    {
      provide: CreateSchoolUseCase,
      useFactory: (
        schools: SchoolRepository,
        invitations: SchoolInvitationRepository,
        roles: SchoolRoleRepository,
        eventEmitter: EventEmitter2,
      ) => new CreateSchoolUseCase(schools, invitations, roles, eventEmitter),
      inject: [SCHOOL_REPOSITORY, SCHOOL_INVITATION_REPOSITORY, SCHOOL_ROLE_REPOSITORY, EventEmitter2],
    },
    {
      provide: UpdateSchoolUseCase,
      useFactory: (schools: SchoolRepository) => new UpdateSchoolUseCase(schools),
      inject: [SCHOOL_REPOSITORY],
    },
    {
      provide: ToggleSchoolStatus,
      useFactory: (schools: SchoolRepository, spaces: SpaceRepository) =>
        new ToggleSchoolStatus(schools, spaces),
      inject: [SCHOOL_REPOSITORY, SPACE_REPOSITORY],
    },
    {
      provide: ReplaceSchoolAdministratorUseCase,
      useFactory: (
        schools: SchoolRepository,
        memberships: SchoolMembershipRepository,
        roles: SchoolRoleRepository,
        users: UserAccountService,
        emitter: EventEmitter2,
      ) =>
        new ReplaceSchoolAdministratorUseCase(schools, memberships, roles, users, (event) => {
          emitter.emit('school.member-role.changed', event);
        }),
      inject: [
        SCHOOL_REPOSITORY,
        SCHOOL_MEMBERSHIP_REPOSITORY,
        SCHOOL_ROLE_REPOSITORY,
        UserAccountService,
        EventEmitter2,
      ],
    },
    {
      provide: ListSchoolsUseCase,
      useFactory: (schools: SchoolRepository, memberships: SchoolMembershipRepository) =>
        new ListSchoolsUseCase(schools, memberships),
      inject: [SCHOOL_REPOSITORY, SCHOOL_MEMBERSHIP_REPOSITORY],
    },

    // --- invitations
    {
      provide: InviteSchoolMemberUseCase,
      useFactory: (
        schools: SchoolRepository,
        invitations: SchoolInvitationRepository,
        memberships: SchoolMembershipRepository,
        roles: SchoolRoleRepository,
        users: UserAccountService,
        eventEmitter: EventEmitter2,
        authorization: SchoolAuthorizationService,
      ) =>
        new InviteSchoolMemberUseCase(
          schools,
          invitations,
          memberships,
          roles,
          users,
          eventEmitter,
          authorization,
        ),
      inject: [
        SCHOOL_REPOSITORY,
        SCHOOL_INVITATION_REPOSITORY,
        SCHOOL_MEMBERSHIP_REPOSITORY,
        SCHOOL_ROLE_REPOSITORY,
        UserAccountService,
        EventEmitter2,
        SchoolAuthorizationService,
      ],
    },
    {
      provide: AcceptSchoolInvitation,
      useFactory: (
        schools: SchoolRepository,
        invitations: SchoolInvitationRepository,
        memberships: SchoolMembershipRepository,
        roles: SchoolRoleRepository,
        users: UserAccountService,
        eventEmitter: EventEmitter2,
      ) => new AcceptSchoolInvitation(schools, invitations, memberships, roles, users, eventEmitter),
      inject: [
        SCHOOL_REPOSITORY,
        SCHOOL_INVITATION_REPOSITORY,
        SCHOOL_MEMBERSHIP_REPOSITORY,
        SCHOOL_ROLE_REPOSITORY,
        UserAccountService,
        EventEmitter2,
      ],
    },

    // --- members
    {
      provide: ListSchoolMembersUseCase,
      useFactory: (
        schools: SchoolRepository,
        memberships: SchoolMembershipRepository,
        roles: SchoolRoleRepository,
        authorization: SchoolAuthorizationService,
        users: UserAccountService,
      ) => new ListSchoolMembersUseCase(schools, memberships, roles, authorization, users),
      inject: [
        SCHOOL_REPOSITORY,
        SCHOOL_MEMBERSHIP_REPOSITORY,
        SCHOOL_ROLE_REPOSITORY,
        SchoolAuthorizationService,
        UserAccountService,
      ],
    },
    {
      provide: SuspendSchoolMemberUseCase,
      useFactory: (memberships: SchoolMembershipRepository, authorization: SchoolAuthorizationService) =>
        new SuspendSchoolMemberUseCase(memberships, authorization),
      inject: [SCHOOL_MEMBERSHIP_REPOSITORY, SchoolAuthorizationService],
    },
    {
      provide: CancelSchoolMemberSuspensionUseCase,
      useFactory: (memberships: SchoolMembershipRepository, authorization: SchoolAuthorizationService) =>
        new CancelSchoolMemberSuspensionUseCase(memberships, authorization),
      inject: [SCHOOL_MEMBERSHIP_REPOSITORY, SchoolAuthorizationService],
    },
    {
      provide: RevokeSchoolMemberUseCase,
      useFactory: (memberships: SchoolMembershipRepository, authorization: SchoolAuthorizationService) =>
        new RevokeSchoolMemberUseCase(memberships, authorization),
      inject: [SCHOOL_MEMBERSHIP_REPOSITORY, SchoolAuthorizationService],
    },
    {
      provide: AssignSchoolMemberRoleUseCase,
      useFactory: (
        memberships: SchoolMembershipRepository,
        roles: SchoolRoleRepository,
        authorization: SchoolAuthorizationService,
        eventEmitter: EventEmitter2,
      ) => new AssignSchoolMemberRoleUseCase(memberships, roles, authorization, eventEmitter),
      inject: [SCHOOL_MEMBERSHIP_REPOSITORY, SCHOOL_ROLE_REPOSITORY, SchoolAuthorizationService, EventEmitter2],
    },
    {
      provide: RemoveSchoolMemberRoleUseCase,
      useFactory: (
        memberships: SchoolMembershipRepository,
        roles: SchoolRoleRepository,
        authorization: SchoolAuthorizationService,
        eventEmitter: EventEmitter2,
      ) => new RemoveSchoolMemberRoleUseCase(memberships, roles, authorization, eventEmitter),
      inject: [SCHOOL_MEMBERSHIP_REPOSITORY, SCHOOL_ROLE_REPOSITORY, SchoolAuthorizationService, EventEmitter2],
    },

    // --- roles
    {
      provide: ListSchoolRolesUseCase,
      useFactory: (
        roles: SchoolRoleRepository,
        memberships: SchoolMembershipRepository,
        authorization: SchoolAuthorizationService,
      ) => new ListSchoolRolesUseCase(roles, memberships, authorization),
      inject: [SCHOOL_ROLE_REPOSITORY, SCHOOL_MEMBERSHIP_REPOSITORY, SchoolAuthorizationService],
    },
    {
      provide: CreateSchoolRoleUseCase,
      useFactory: (
        roles: SchoolRoleRepository,
        authorization: SchoolAuthorizationService,
        eventEmitter: EventEmitter2,
      ) => new CreateSchoolRoleUseCase(roles, authorization, eventEmitter),
      inject: [SCHOOL_ROLE_REPOSITORY, SchoolAuthorizationService, EventEmitter2],
    },
    {
      provide: UpdateSchoolRoleUseCase,
      useFactory: (
        roles: SchoolRoleRepository,
        authorization: SchoolAuthorizationService,
        eventEmitter: EventEmitter2,
      ) => new UpdateSchoolRoleUseCase(roles, authorization, eventEmitter),
      inject: [SCHOOL_ROLE_REPOSITORY, SchoolAuthorizationService, EventEmitter2],
    },
    {
      provide: DeleteSchoolRoleUseCase,
      useFactory: (
        roles: SchoolRoleRepository,
        memberships: SchoolMembershipRepository,
        authorization: SchoolAuthorizationService,
        eventEmitter: EventEmitter2,
      ) => new DeleteSchoolRoleUseCase(roles, memberships, authorization, eventEmitter),
      inject: [SCHOOL_ROLE_REPOSITORY, SCHOOL_MEMBERSHIP_REPOSITORY, SchoolAuthorizationService, EventEmitter2],
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