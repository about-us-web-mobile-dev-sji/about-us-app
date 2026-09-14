import { Body, Controller, Get, Param, Post, Patch, UseGuards, Request } from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto.js';
import { ReplaceSchoolAdminDto } from './dto/replace-school-admin.dto.js';
import { CreateSchoolUseCase } from '../../application/use-cases/commands/create-school/CreateSchool.js';
import { ReplaceSchoolAdministratorUseCase } from '../../application/use-cases/commands/replace-school-administrator/ReplaceSchoolAdministrator.js';
import { Roles } from '../../../auth/infrastructure/http/decorators/roles.decorator.js';
import { RolesGuard } from '../../../auth/infrastructure/http/roles.guard.js';
import { AuthGuard } from '../../../auth/infrastructure/http/auth.guard.js';
import { GlobalRole } from '../../../user/domain/enum/global-role.enum.js';
import type { AuthenticatedRequest } from '../../../auth/infrastructure/http/auth.guard.js';

@Controller('schools')
@UseGuards(AuthGuard, RolesGuard)
export class SchoolController {
  constructor(
    private readonly createSchool: CreateSchoolUseCase,
    private readonly replaceAdmin: ReplaceSchoolAdministratorUseCase,
  ) {}

  @Post()
  @Roles(GlobalRole.SUPER_ADMIN)
  async create(@Body() dto: CreateSchoolDto, @Request() req: AuthenticatedRequest) {
    const userId = req.auth.user.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    return await this.createSchool.handle({
      name: dto.name,
      address: dto.address,
      city: dto.city,
      postalCode: dto.postalCode,
      country: dto.country,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      website: dto.website,
      adminUserId: dto.adminUserId,
      createdBy: userId,
    });
  }

  @Patch(':schoolId/administrator')
  @Roles(GlobalRole.SUPER_ADMIN)
  async replaceAdministrator(
    @Param('schoolId') schoolId: string,
    @Body() dto: ReplaceSchoolAdminDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.auth.user.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    return await this.replaceAdmin.handle({
      schoolId,
      newAdminUserId: dto.newAdminUserId,
      performedBy: userId,
    });
  }
}
