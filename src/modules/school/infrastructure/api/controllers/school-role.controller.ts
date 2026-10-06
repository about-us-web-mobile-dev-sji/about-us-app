import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { Roles } from '../../../../auth/infrastructure/api/decorators/roles.decorator.js';
import { GlobalRole } from '../../../../user/domain/enum/global-role.enum.js';
import { CreateSchoolRoleUseCase } from '../../../application/use-cases/commands/create-school-role/create-school-role.js';
import { UpdateSchoolRoleUseCase } from '../../../application/use-cases/commands/update-school-role/update-school-role.js';
import { DeleteSchoolRoleUseCase } from '../../../application/use-cases/commands/delete-school-role/delete-school-role.js';
import { ListSchoolRolesUseCase } from '../../../application/use-cases/queries/list-school-roles/list-school-roles.js';
import { CreateSchoolRoleDto } from '../dto/create-school-role.dto.js';
import { UpdateSchoolRoleDto } from '../dto/update-school-role.dto.js';
import { SchoolRoleResponse } from '../dto/responses/school-role.response.js';

@Controller('schools')
@UseGuards(AuthGuard, RolesGuard)
@Roles(GlobalRole.SUPER_ADMIN)
export class SchoolRoleController {
  constructor(
    private readonly listRoles: ListSchoolRolesUseCase,
    private readonly createRole: CreateSchoolRoleUseCase,
    private readonly updateRole: UpdateSchoolRoleUseCase,
    private readonly deleteRole: DeleteSchoolRoleUseCase,
  ) {}

  private performer(req: AuthenticatedRequest): string {
    const performedBy = req.auth.subjectId;
    if (!performedBy) {
      throw new UnauthorizedException('User not authenticated');
    }
    return performedBy;
  }

  @Get(':schoolId/roles')
  async list(
    @Param('schoolId') schoolId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const output = await this.listRoles.handle({
      schoolId,
      performedBy: this.performer(req),
      // Needed to pick a role when inviting from the platform console.
      platformAdmin: req.auth.user.globalRole === GlobalRole.SUPER_ADMIN,
    });
    return output.roles.map((role) => SchoolRoleResponse.fromOutput(role));
  }

  @Post(':schoolId/roles')
  async create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateSchoolRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const output = await this.createRole.handle({
      schoolId,
      name: dto.name,
      description: dto.description,
      permissions: dto.permissions,
      performedBy: this.performer(req),
    });
    return SchoolRoleResponse.fromOutput(output.role);
  }

  @Patch(':schoolId/roles/:roleId')
  async update(
    @Param('schoolId') schoolId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateSchoolRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const output = await this.updateRole.handle({
      schoolId,
      roleId,
      name: dto.name,
      description: dto.description,
      permissions: dto.permissions,
      performedBy: this.performer(req),
    });
    return SchoolRoleResponse.fromOutput(output.role);
  }

  @Delete(':schoolId/roles/:roleId')
  async remove(
    @Param('schoolId') schoolId: string,
    @Param('roleId') roleId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.deleteRole.handle({
      schoolId,
      roleId,
      performedBy: this.performer(req),
    });
  }
}
