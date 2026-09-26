import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { Roles } from '../../../../auth/infrastructure/api/decorators/roles.decorator.js';
import { GlobalRole } from '../../../../user/domain/enum/global-role.enum.js';
import type { AuthenticatedRequest } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { AddMemberDto, AssignManagerDto, SpaceMembershipResponseDto, GetEffectiveManagersResponseDto, GetEffectiveMemberDesignationResponseDto, PaginatedResponseDto, GetChildrenQueryDto } from '../dto/space.dto.js';
import { AddMemberUseCase } from '../../../application/use-cases/commands/add-member/add-member.js';
import { RemoveMemberUseCase } from '../../../application/use-cases/commands/remove-member/remove-member.js';
import { AssignManagerUseCase } from '../../../application/use-cases/commands/assign-manager/assign-manager.js';
import { RemoveManagerUseCase } from '../../../application/use-cases/commands/remove-manager/remove-manager.js';
import { GetMembersUseCase } from '../../../application/use-cases/queries/get-members/get-members.js';
import { GetEffectiveManagersUseCase } from '../../../application/use-cases/queries/get-effective-managers/get-effective-managers.js';
import { CanManageUseCase } from '../../../application/use-cases/queries/can-manage/can-manage.js';
import { GetEffectiveMemberDesignationUseCase } from '../../../application/use-cases/queries/get-effective-member-designation/get-effective-member-designation.js';
import type { UUID } from 'node:crypto';

@ApiTags('space-memberships')
@Controller('spaces/:spaceId/members')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class SpaceMembershipController {
  constructor(
    private readonly addMemberUseCase: AddMemberUseCase,
    private readonly removeMemberUseCase: RemoveMemberUseCase,
    private readonly assignManagerUseCase: AssignManagerUseCase,
    private readonly removeManagerUseCase: RemoveManagerUseCase,
    private readonly getMembersUseCase: GetMembersUseCase,
    private readonly getEffectiveManagersUseCase: GetEffectiveManagersUseCase,
    private readonly canManageUseCase: CanManageUseCase,
    private readonly getEffectiveDesignationUseCase: GetEffectiveMemberDesignationUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add a member to the space' })
  @ApiResponse({ status: 201, type: SpaceMembershipResponseDto })
  async add(@Param('spaceId') spaceId: string, @Body() dto: AddMemberDto, @Req() req: AuthenticatedRequest) {
    const result = await this.addMemberUseCase.handle({
      spaceId: spaceId as UUID,
      userId: dto.userId as UUID,
      role: dto.role,
      actorId: req.auth.subjectId as UUID,
    });
    return SpaceMembershipResponseDto.fromDomain(result);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Remove a member from the space' })
  @ApiResponse({ status: 200, type: SpaceMembershipResponseDto })
  async remove(@Param('spaceId') spaceId: string, @Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    const result = await this.removeMemberUseCase.handle({
      spaceId: spaceId as UUID,
      userId: userId as UUID,
      actorId: req.auth.subjectId as UUID,
    });
    return SpaceMembershipResponseDto.fromDomain(result);
  }

  @Put('manager')
  @Roles(GlobalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign a manager to the space' })
  @ApiResponse({ status: 201, type: SpaceMembershipResponseDto })
  async assignManager(@Param('spaceId') spaceId: string, @Body() dto: AssignManagerDto, @Req() req: AuthenticatedRequest) {
    const result = await this.assignManagerUseCase.handle({
      spaceId: spaceId as UUID,
      userId: dto.userId as UUID,
      actorId: req.auth.subjectId as UUID,
    });
    return SpaceMembershipResponseDto.fromDomain(result);
  }

  @Delete('manager')
  @Roles(GlobalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove the manager from the space' })
  @ApiResponse({ status: 200, type: SpaceMembershipResponseDto })
  async removeManager(@Param('spaceId') spaceId: string, @Req() req: AuthenticatedRequest) {
    const result = await this.removeManagerUseCase.handle({
      spaceId: spaceId as UUID,
      actorId: req.auth.subjectId as UUID,
    });
    return SpaceMembershipResponseDto.fromDomain(result);
  }

  @Get()
  @ApiOperation({ summary: 'Get members of the space' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto<SpaceMembershipResponseDto> })
  async getMembers(@Param('spaceId') spaceId: string, @Query() query: GetChildrenQueryDto) {
    const result = await this.getMembersUseCase.handle({
      spaceId: spaceId as UUID,
      page: query.page,
      limit: query.limit,
      status: query.status as any,
      role: query.kind as any,
    });
    return {
      ...result,
      items: result.items.map(SpaceMembershipResponseDto.fromDomain),
    };
  }

  @Get('effective-managers')
  @ApiOperation({ summary: 'Get effective managers (direct + inherited)' })
  @ApiResponse({ status: 200, type: GetEffectiveManagersResponseDto })
  async getEffectiveManagers(@Param('spaceId') spaceId: string) {
    const result = await this.getEffectiveManagersUseCase.handle({ spaceId: spaceId as UUID });
    return {
      spaceId: result.spaceId,
      directManager: result.directManager ? SpaceMembershipResponseDto.fromDomain(result.directManager) : null,
      inheritedManagers: result.inheritedManagers.map(SpaceMembershipResponseDto.fromDomain),
    };
  }

  @Get('can-manage/:userId')
  @ApiOperation({ summary: 'Check if user can manage this space' })
  @ApiResponse({ status: 200 })
  async checkCanManage(@Param('spaceId') spaceId: string, @Param('userId') userId: string) {
    const result = await this.canManageUseCase.handle(userId as UUID, spaceId as UUID);
    return { canManage: result.canManage };
  }

  @Get('effective-designation')
  @ApiOperation({ summary: 'Get effective member designation (local or inherited)' })
  @ApiResponse({ status: 200, type: GetEffectiveMemberDesignationResponseDto })
  async getEffectiveDesignation(@Param('spaceId') spaceId: string) {
    const result = await this.getEffectiveDesignationUseCase.handle({ spaceId: spaceId as UUID });
    return {
      spaceId: result.spaceId,
      localDesignation: result.localDesignation ? { key: result.localDesignation.key, singular: result.localDesignation.singular, plural: result.localDesignation.plural } : null,
      effectiveDesignation: result.effectiveDesignation ? { key: result.effectiveDesignation.key, singular: result.effectiveDesignation.singular, plural: result.effectiveDesignation.plural } : null,
      inheritedFromSpaceId: result.inheritedFromSpaceId ?? null,
    };
  }
}