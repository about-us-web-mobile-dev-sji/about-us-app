import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { CreateSpaceDto, InsertParentDto, MoveSpaceDto, UpdateMemberDesignationDto, EnsureSchoolRootDto, GetChildrenQueryDto, GetSubtreeQueryDto, SpaceResponseDto, PaginatedResponseDto } from '../dto/space.dto.js';
import { CreateSpaceUseCase } from '../../../application/use-cases/commands/create-space/create-space.js';
import { InsertParentUseCase } from '../../../application/use-cases/commands/insert-parent/insert-parent.js';
import { MoveSpaceUseCase } from '../../../application/use-cases/commands/move-space/move-space.js';
import { ArchiveSpaceUseCase } from '../../../application/use-cases/commands/archive-space/archive-space.js';
import { RestoreSpaceUseCase } from '../../../application/use-cases/commands/restore-space/restore-space.js';
import { DeleteSpaceUseCase } from '../../../application/use-cases/commands/delete-space/delete-space.js';
import { UpdateMemberDesignationUseCase } from '../../../application/use-cases/commands/update-member-designation/update-member-designation.js';
import { GetSpaceUseCase } from '../../../application/use-cases/queries/get-space/get-space.js';
import { GetChildrenUseCase } from '../../../application/use-cases/queries/get-children/get-children.js';
import { GetSubtreeUseCase } from '../../../application/use-cases/queries/get-subtree/get-subtree.js';
import { GetPathToRootUseCase } from '../../../application/use-cases/queries/get-path-to-root/get-path-to-root.js';
import { GetSchoolTreeUseCase } from '../../../application/use-cases/queries/get-school-tree/get-school-tree.js';
import { EnsureSchoolRootUseCase } from '../../../application/use-cases/commands/ensure-school-root/ensure-school-root.js';
import { EnsureSchoolRootOutput } from '../../../application/dto/school-root.dto.js';
import type { UUID } from 'node:crypto';

@ApiTags('spaces')
@Controller('spaces')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class SpaceController {
  constructor(
    private readonly createSpaceUseCase: CreateSpaceUseCase,
    private readonly insertParentUseCase: InsertParentUseCase,
    private readonly moveSpaceUseCase: MoveSpaceUseCase,
    private readonly archiveSpaceUseCase: ArchiveSpaceUseCase,
    private readonly restoreSpaceUseCase: RestoreSpaceUseCase,
    private readonly deleteSpaceUseCase: DeleteSpaceUseCase,
    private readonly updateMemberDesignationUseCase: UpdateMemberDesignationUseCase,
    private readonly getSpaceUseCase: GetSpaceUseCase,
    private readonly getChildrenUseCase: GetChildrenUseCase,
    private readonly getSubtreeUseCase: GetSubtreeUseCase,
    private readonly getPathToRootUseCase: GetPathToRootUseCase,
    private readonly getSchoolTreeUseCase: GetSchoolTreeUseCase,
    private readonly ensureSchoolRootUseCase: EnsureSchoolRootUseCase,
  ) {}

  @Post()
  @Roles(GlobalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new space under a parent' })
  @ApiResponse({ status: 201, type: SpaceResponseDto })
  async create(@Body() dto: CreateSpaceDto, @Req() req: AuthenticatedRequest) {
    const result = await this.createSpaceUseCase.handle({
      parentId: dto.parentId as UUID,
      name: dto.name,
      description: dto.description ?? null,
      memberDesignation: dto.memberDesignation?.toDomain() ?? null,
      actorId: req.auth.subjectId as UUID,
    });
    return SpaceResponseDto.fromDomain(result);
  }

  @Post('ensure-root')
  @Roles(GlobalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ensure school root space exists (idempotent)' })
  @ApiResponse({ status: 200, type: SpaceResponseDto })
  async ensureRoot(@Body() dto: EnsureSchoolRootDto): Promise<EnsureSchoolRootOutput> {
    return this.ensureSchoolRootUseCase.handle({ schoolId: dto.schoolId as UUID, name: dto.name });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get space by ID' })
  @ApiResponse({ status: 200, type: SpaceResponseDto })
  async findById(@Param('id') id: string): Promise<SpaceResponseDto> {
    const space = await this.getSpaceUseCase.handle(id as UUID);
    return SpaceResponseDto.fromDomain(space);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get direct children of a space' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto<SpaceResponseDto> })
  async getChildren(@Param('id') id: string, @Query() query: GetChildrenQueryDto) {
    const result = await this.getChildrenUseCase.handle({
      parentId: id as UUID,
      page: query.page,
      limit: query.limit,
      status: query.status,
      kind: query.kind,
    });
    return {
      ...result,
      items: result.items.map(SpaceResponseDto.fromDomain),
    };
  }

  @Get(':id/subtree')
  @ApiOperation({ summary: 'Get subtree of a space' })
  @ApiResponse({ status: 200, type: [SpaceResponseDto] })
  async getSubtree(@Param('id') id: string, @Query() query: GetSubtreeQueryDto) {
    const result = await this.getSubtreeUseCase.handle({
      rootId: id as UUID,
      maxDepth: query.maxDepth,
    });
    return result.items.map(SpaceResponseDto.fromDomain);
  }

  @Get(':id/path')
  @ApiOperation({ summary: 'Get path from space to root' })
  @ApiResponse({ status: 200, type: [SpaceResponseDto] })
  async getPathToRoot(@Param('id') id: string) {
    const result = await this.getPathToRootUseCase.handle(id as UUID);
    return result.items.map(SpaceResponseDto.fromDomain);
  }

  @Get('school/:schoolId/tree')
  @ApiOperation({ summary: 'Get full school space tree' })
  @ApiResponse({ status: 200, type: [SpaceResponseDto] })
  async getSchoolTree(@Param('schoolId') schoolId: string) {
    const result = await this.getSchoolTreeUseCase.handle(schoolId as UUID);
    return result.items.map(SpaceResponseDto.fromDomain);
  }

  @Post(':id/insert-parent')
  @Roles(GlobalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Insert a new parent between space and its parent' })
  @ApiResponse({ status: 201, type: SpaceResponseDto })
  async insertParent(@Param('id') id: string, @Body() dto: InsertParentDto, @Req() req: AuthenticatedRequest) {
    const result = await this.insertParentUseCase.handle({
      childId: id as UUID,
      name: dto.name,
      description: dto.description ?? null,
      memberDesignation: dto.memberDesignation?.toDomain() ?? null,
      actorId: req.auth.subjectId as UUID,
    });
    return SpaceResponseDto.fromDomain(result.newSpace);
  }

  @Post(':id/move')
  @Roles(GlobalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Move space under a new parent' })
  @ApiResponse({ status: 200 })
  async move(@Param('id') id: string, @Body() dto: MoveSpaceDto, @Req() req: AuthenticatedRequest) {
    return this.moveSpaceUseCase.handle({
      spaceId: id as UUID,
      newParentId: dto.newParentId as UUID,
      actorId: req.auth.subjectId as UUID,
    });
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a space' })
  @ApiResponse({ status: 200 })
  async archive(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.archiveSpaceUseCase.handle({
      spaceId: id as UUID,
      actorId: req.auth.subjectId as UUID,
    });
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore an archived space' })
  @ApiResponse({ status: 200 })
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.restoreSpaceUseCase.handle({
      spaceId: id as UUID,
      actorId: req.auth.subjectId as UUID,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a space (soft delete)' })
  @ApiResponse({ status: 200 })
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Query('recursive') recursive?: string) {
    return this.deleteSpaceUseCase.handle({
      spaceId: id as UUID,
      actorId: req.auth.subjectId as UUID,
      recursive: recursive === 'true',
    });
  }

  @Patch(':id/designation')
  @ApiOperation({ summary: 'Update member designation of a space' })
  @ApiResponse({ status: 200 })
  async updateDesignation(@Param('id') id: string, @Body() dto: UpdateMemberDesignationDto, @Req() req: AuthenticatedRequest) {
    return this.updateMemberDesignationUseCase.handle({
      spaceId: id as UUID,
      memberDesignation: dto.memberDesignation?.toDomain() ?? null,
      actorId: req.auth.subjectId as UUID,
    });
  }
}