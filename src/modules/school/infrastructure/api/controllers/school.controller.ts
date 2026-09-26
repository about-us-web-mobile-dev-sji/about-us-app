import { Body, Controller, Get, Param, Post, Patch, UseGuards, Request, Req, UnauthorizedException } from '@nestjs/common';
import { CreateSchoolDto } from '../dto/create-school.dto.js';
import { ReplaceSchoolAdminDto } from '../dto/replace-school-admin.dto.js';
import { ReplaceSchoolAdministratorUseCase } from '../../../application/use-cases/commands/replace-school-administrator/ReplaceSchoolAdministrator.js';
import { Roles } from '../../../../auth/infrastructure/api/decorators/roles.decorator.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { GlobalRole } from '../../../../user/domain/enum/global-role.enum.js';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto.js';
import { CreateSchoolUseCase } from '../../../application/use-cases/commands/create-school/CreateSchool.js';
import { ListSchoolsUseCase } from '../../../application/use-cases/queries/list-schools/ListSchools.js';
import { AuthGuard, type AuthenticatedRequest } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { SchoolResponseDto } from '../dto/school-response.dto.js';
import { ToggleSchoolStatus } from '../../../application/use-cases/commands/toggle-school-status/ToggleSchoolStatus.js';
import { AcceptSchoolInvitation } from '../../../application/use-cases/commands/accept-school-invitation/AcceptSchoolInvitation.js';
import { SuspendSchoolMemberUseCase } from '../../../application/use-cases/commands/suspend-school-member/suspend-school-member.js';
import { CancelSchoolMemberSuspensionUseCase } from '../../../application/use-cases/commands/cancel-school-member-suspension/cancel-school-member-suspension.js';
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
    private readonly suspendMember: SuspendSchoolMemberUseCase,
    private readonly cancelMemberSuspension: CancelSchoolMemberSuspensionUseCase,
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
          throw new UnauthorizedException('User not authenticated');
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
          throw new UnauthorizedException('User not authenticated');
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

  @Patch(':schoolId/members/:memberUserId/suspend')
  async suspendSchoolMember(
    @Param('schoolId') schoolId: string,
    @Param('memberUserId') memberUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;

    if (!performedBy) {
          throw new UnauthorizedException('User not authenticated');
    }

    const { membership } = await this.suspendMember.handle({
      schoolId,
      memberUserId,
      performedBy,
    });

    return membership.toPrimitives();
  }

  @Patch(':schoolId/members/:memberUserId/cancel-suspension')
  async cancelSchoolMemberSuspension(
    @Param('schoolId') schoolId: string,
    @Param('memberUserId') memberUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const performedBy = req.auth.subjectId;

    if (!performedBy) {
          throw new UnauthorizedException('User not authenticated');
    }

    const { membership } = await this.cancelMemberSuspension.handle({
      schoolId,
      memberUserId,
      performedBy,
    });

    return membership.toPrimitives();
  }
}
