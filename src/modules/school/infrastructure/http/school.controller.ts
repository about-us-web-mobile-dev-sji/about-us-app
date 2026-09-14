import { Body, Controller, Get, Param, Post, Patch, UseGuards, Request, Req } from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto.js';
import { ReplaceSchoolAdminDto } from './dto/replace-school-admin.dto.js';
import { ReplaceSchoolAdministratorUseCase } from '../../application/use-cases/commands/replace-school-administrator/ReplaceSchoolAdministrator.js';
import { Roles } from '../../../auth/infrastructure/http/decorators/roles.decorator.js';
import { RolesGuard } from '../../../auth/infrastructure/http/roles.guard.js';
import { GlobalRole } from '../../../user/domain/enum/global-role.enum.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { CreateSchoolUseCase } from '../../application/use-cases/commands/create-school/CreateSchool.js';
import { ListSchoolsUseCase } from '../../application/use-cases/queries/list-schools/ListSchools.js';
import { AuthGuard, type AuthenticatedRequest } from '../../../auth/infrastructure/http/auth.guard.js';
import { SchoolResponseDto } from './dto/school-response.dto.js';
import { ToggleSchoolStatus } from '../../application/use-cases/commands/toggle-school-status/ToggleSchoolStatus.js';
import { AcceptSchoolInvitation } from '../../application/use-cases/commands/accept-school-invitation/AcceptSchoolInvitation.js';
import type { UUID } from 'crypto';

@Controller('schools')
@UseGuards(AuthGuard, RolesGuard)
export class SchoolController {
  constructor(
    private readonly createSchool: CreateSchoolUseCase,
    private readonly replaceAdmin: ReplaceSchoolAdministratorUseCase,
     private readonly listSchools: ListSchoolsUseCase,
    private readonly toggleStatus: ToggleSchoolStatus,
    private readonly acceptSchoolInvitation: AcceptSchoolInvitation,
  ) {}

  

  @Get()
  @UseGuards(AuthGuard)
  async findAll(): Promise<SchoolResponseDto[]> {
    const output = await this.listSchools.handle();
    return SchoolResponseDto.fromOutput(output);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() dto: CreateSchoolDto, @Req() req: AuthenticatedRequest) {
    const userId = req.auth.subjectId;

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
    @Param('schoolId') schoolId: UUID,
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

  @Patch(':id/toggle-block')
  async toggleBlock(@Param('id') id: string) {
    const { school } = await this.toggleStatus.handle({ schoolId: id });
    return school.toPrimitives();
  }

  @Post(':id/accept')
  async acceptInvitation(
    @Param('id') id: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    const { school } = await this.acceptSchoolInvitation.handle({
      schoolId: id,
      adminUserId: dto.adminUserId,
    });
    return school.toPrimitives();
  }
}
