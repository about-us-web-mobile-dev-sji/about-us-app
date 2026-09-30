import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { SpaceEntity } from './infrastructure/persistence/typeorm/space.entity.js';
import { SpaceMembershipEntity } from './infrastructure/persistence/typeorm/space-membership.entity.js';
import { TypeormSpaceRepository } from './infrastructure/persistence/typeorm-space.repository.js';
import { TypeormSpaceMembershipRepository } from './infrastructure/persistence/typeorm-space-membership.repository.js';
import { EnsureSchoolRootUseCase } from './application/use-cases/commands/ensure-school-root/ensure-school-root.js';
import { CreateSpaceUseCase } from './application/use-cases/commands/create-space/create-space.js';
import { InsertParentUseCase } from './application/use-cases/commands/insert-parent/insert-parent.js';
import { MoveSpaceUseCase } from './application/use-cases/commands/move-space/move-space.js';
import { ArchiveSpaceUseCase } from './application/use-cases/commands/archive-space/archive-space.js';
import { RestoreSpaceUseCase } from './application/use-cases/commands/restore-space/restore-space.js';
import { DeleteSpaceUseCase } from './application/use-cases/commands/delete-space/delete-space.js';
import { AddMemberUseCase } from './application/use-cases/commands/add-member/add-member.js';
import { RemoveMemberUseCase } from './application/use-cases/commands/remove-member/remove-member.js';
import { AssignManagerUseCase } from './application/use-cases/commands/assign-manager/assign-manager.js';
import { RemoveManagerUseCase } from './application/use-cases/commands/remove-manager/remove-manager.js';
import { UpdateMemberDesignationUseCase } from './application/use-cases/commands/update-member-designation/update-member-designation.js';
import { PurgeSchoolSpaceTreeUseCase } from './application/use-cases/commands/purge-school-space-tree/purge-school-space-tree.js';
import { GetSpaceUseCase } from './application/use-cases/queries/get-space/get-space.js';
import { GetChildrenUseCase } from './application/use-cases/queries/get-children/get-children.js';
import { GetSubtreeUseCase } from './application/use-cases/queries/get-subtree/get-subtree.js';
import { GetPathToRootUseCase } from './application/use-cases/queries/get-path-to-root/get-path-to-root.js';
import { GetSchoolTreeUseCase } from './application/use-cases/queries/get-school-tree/get-school-tree.js';
import { GetMembersUseCase } from './application/use-cases/queries/get-members/get-members.js';
import { GetEffectiveManagersUseCase } from './application/use-cases/queries/get-effective-managers/get-effective-managers.js';
import { CanManageUseCase } from './application/use-cases/queries/can-manage/can-manage.js';
import { GetEffectiveMemberDesignationUseCase } from './application/use-cases/queries/get-effective-member-designation/get-effective-member-designation.js';
import { GetSpacesByDesignationKeyUseCase } from './application/use-cases/queries/get-spaces-by-designation-key/get-spaces-by-designation-key.js';
import { SpaceController } from './infrastructure/api/controllers/space.controller.js';
import { SpaceMembershipController } from './infrastructure/api/controllers/space-membership.controller.js';
import { SpaceDesignationController } from './infrastructure/api/controllers/space-designation.controller.js';
import {
  SPACE_REPOSITORY,
  type SpaceRepository,
} from './domain/repositories/i-space.repository.js';
import {
  SPACE_MEMBERSHIP_REPOSITORY,
  type SpaceMembershipRepository,
} from './domain/repositories/i-space-membership.repository.js';
import {
  SPACE_AUTHORIZATION_GATEWAY,
  type SpaceAuthorizationGateway,
} from './application/ports/space-authorization.gateway.js';
import type { SpaceAuthorizationGateway as SpaceAuthorizationGatewayType } from './application/ports/space-authorization.gateway.js';
import { SpaceAuthorizationGatewayImpl } from './infrastructure/services/space-authorization.gateway.js';
import { APP_FILTER } from '@nestjs/core';
import { SpaceExceptionFilter } from './infrastructure/api/space-exception.filter.js';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([SpaceEntity, SpaceMembershipEntity]),
    AuthModule,
  ],
  controllers: [SpaceController, SpaceMembershipController, SpaceDesignationController],
  exports: [
    EnsureSchoolRootUseCase,
    PurgeSchoolSpaceTreeUseCase,
    CanManageUseCase,
    GetSpaceUseCase,
    GetChildrenUseCase,
    GetSubtreeUseCase,
    GetPathToRootUseCase,
    GetSchoolTreeUseCase,
  ],
  providers: [
    {
      provide: SPACE_REPOSITORY,
      useFactory: (repo: Repository<SpaceEntity>) =>
        new TypeormSpaceRepository(repo),
      inject: [getRepositoryToken(SpaceEntity)],
    },
    {
      provide: SPACE_MEMBERSHIP_REPOSITORY,
      useFactory: (repo: Repository<SpaceMembershipEntity>) =>
        new TypeormSpaceMembershipRepository(repo),
      inject: [getRepositoryToken(SpaceMembershipEntity)],
    },
    {
      provide: SPACE_AUTHORIZATION_GATEWAY,
      useClass: SpaceAuthorizationGatewayImpl,
    },
    {
      provide: EnsureSchoolRootUseCase,
      useFactory: (spaces: SpaceRepository) => new EnsureSchoolRootUseCase(spaces),
      inject: [SPACE_REPOSITORY],
    },
    {
      provide: CreateSpaceUseCase,
      useFactory: (spaces: SpaceRepository, auth: any) =>
        new CreateSpaceUseCase(spaces, auth),
      inject: [SPACE_REPOSITORY, SPACE_AUTHORIZATION_GATEWAY],
    },
    {
      provide: InsertParentUseCase,
      useFactory: (spaces: SpaceRepository, auth: any, dataSource: DataSource) =>
        new InsertParentUseCase(spaces, auth, dataSource),
      inject: [SPACE_REPOSITORY, SPACE_AUTHORIZATION_GATEWAY, DataSource],
    },
    {
      provide: MoveSpaceUseCase,
      useFactory: (spaces: SpaceRepository, auth: any, dataSource: DataSource) =>
        new MoveSpaceUseCase(spaces, auth, dataSource),
      inject: [SPACE_REPOSITORY, SPACE_AUTHORIZATION_GATEWAY, DataSource],
    },
    {
      provide: ArchiveSpaceUseCase,
      useFactory: (spaces: SpaceRepository, auth: any) =>
        new ArchiveSpaceUseCase(spaces, auth),
      inject: [SPACE_REPOSITORY, SPACE_AUTHORIZATION_GATEWAY],
    },
    {
      provide: RestoreSpaceUseCase,
      useFactory: (spaces: SpaceRepository, auth: any) =>
        new RestoreSpaceUseCase(spaces, auth),
      inject: [SPACE_REPOSITORY, SPACE_AUTHORIZATION_GATEWAY],
    },
    {
      provide: DeleteSpaceUseCase,
      useFactory: (spaces: SpaceRepository, memberships: SpaceMembershipRepository, auth: any, dataSource: DataSource) =>
        new DeleteSpaceUseCase(spaces, memberships, auth, dataSource),
      inject: [SPACE_REPOSITORY, SPACE_MEMBERSHIP_REPOSITORY, SPACE_AUTHORIZATION_GATEWAY, DataSource],
    },
    {
      provide: AddMemberUseCase,
      useFactory: (spaces: SpaceRepository, memberships: SpaceMembershipRepository, auth: any) =>
        new AddMemberUseCase(spaces, memberships, auth),
      inject: [SPACE_REPOSITORY, SPACE_MEMBERSHIP_REPOSITORY, SPACE_AUTHORIZATION_GATEWAY],
    },
    {
      provide: RemoveMemberUseCase,
      useFactory: (spaces: SpaceRepository, memberships: SpaceMembershipRepository, auth: any) =>
        new RemoveMemberUseCase(spaces, memberships, auth),
      inject: [SPACE_REPOSITORY, SPACE_MEMBERSHIP_REPOSITORY, SPACE_AUTHORIZATION_GATEWAY],
    },
    {
      provide: AssignManagerUseCase,
      useFactory: (spaces: SpaceRepository, memberships: SpaceMembershipRepository, auth: any) =>
        new AssignManagerUseCase(spaces, memberships, auth),
      inject: [SPACE_REPOSITORY, SPACE_MEMBERSHIP_REPOSITORY, SPACE_AUTHORIZATION_GATEWAY],
    },
    {
      provide: RemoveManagerUseCase,
      useFactory: (spaces: SpaceRepository, memberships: SpaceMembershipRepository, auth: any) =>
        new RemoveManagerUseCase(spaces, memberships, auth),
      inject: [SPACE_REPOSITORY, SPACE_MEMBERSHIP_REPOSITORY, SPACE_AUTHORIZATION_GATEWAY],
    },
    {
      provide: UpdateMemberDesignationUseCase,
      useFactory: (spaces: SpaceRepository, auth: any) =>
        new UpdateMemberDesignationUseCase(spaces, auth),
      inject: [SPACE_REPOSITORY, SPACE_AUTHORIZATION_GATEWAY],
    },
    {
      provide: PurgeSchoolSpaceTreeUseCase,
      useFactory: (spaces: SpaceRepository, memberships: SpaceMembershipRepository) =>
        new PurgeSchoolSpaceTreeUseCase(spaces, memberships),
      inject: [SPACE_REPOSITORY, SPACE_MEMBERSHIP_REPOSITORY],
    },
    {
      provide: GetSpaceUseCase,
      useFactory: (spaces: SpaceRepository) => new GetSpaceUseCase(spaces),
      inject: [SPACE_REPOSITORY],
    },
    {
      provide: GetChildrenUseCase,
      useFactory: (spaces: SpaceRepository) => new GetChildrenUseCase(spaces),
      inject: [SPACE_REPOSITORY],
    },
    {
      provide: GetSubtreeUseCase,
      useFactory: (spaces: SpaceRepository) => new GetSubtreeUseCase(spaces),
      inject: [SPACE_REPOSITORY],
    },
    {
      provide: GetPathToRootUseCase,
      useFactory: (spaces: SpaceRepository) => new GetPathToRootUseCase(spaces),
      inject: [SPACE_REPOSITORY],
    },
    {
      provide: GetSchoolTreeUseCase,
      useFactory: (spaces: SpaceRepository) => new GetSchoolTreeUseCase(spaces),
      inject: [SPACE_REPOSITORY],
    },
    {
      provide: GetMembersUseCase,
      useFactory: (spaces: SpaceRepository, memberships: SpaceMembershipRepository) =>
        new GetMembersUseCase(spaces, memberships),
      inject: [SPACE_REPOSITORY, SPACE_MEMBERSHIP_REPOSITORY],
    },
    {
      provide: GetEffectiveManagersUseCase,
      useFactory: (spaces: SpaceRepository, memberships: SpaceMembershipRepository) =>
        new GetEffectiveManagersUseCase(spaces, memberships),
      inject: [SPACE_REPOSITORY, SPACE_MEMBERSHIP_REPOSITORY],
    },
    {
      provide: CanManageUseCase,
      useFactory: (spaces: SpaceRepository, memberships: SpaceMembershipRepository) =>
        new CanManageUseCase(spaces, memberships),
      inject: [SPACE_REPOSITORY, SPACE_MEMBERSHIP_REPOSITORY],
    },
    {
      provide: GetEffectiveMemberDesignationUseCase,
      useFactory: (spaces: SpaceRepository) => new GetEffectiveMemberDesignationUseCase(spaces),
      inject: [SPACE_REPOSITORY],
    },
    {
      provide: GetSpacesByDesignationKeyUseCase,
      useFactory: (spaces: SpaceRepository) => new GetSpacesByDesignationKeyUseCase(spaces),
      inject: [SPACE_REPOSITORY],
    },
    { provide: APP_FILTER, useClass: SpaceExceptionFilter },
  ],
})
export class SpacesModule {}