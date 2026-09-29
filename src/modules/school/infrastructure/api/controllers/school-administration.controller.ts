import { Controller, Param, Patch, Request, UnauthorizedException, UseGuards, Body } from '@nestjs/common';
import { ReplaceSchoolAdminDto } from '../dto/replace-school-admin.dto.js';
import { ReplaceSchoolAdministratorUseCase } from '../../../application/use-cases/commands/replace-school-administrator/replace-school-administrator.js';
import { Roles } from '../../../../auth/infrastructure/api/decorators/roles.decorator.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { GlobalRole } from '../../../../user/domain/enum/global-role.enum.js';
import { AuthGuard, type AuthenticatedRequest } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { ReplaceAdministratorResponse } from '../dto/responses/replace-administrator.response.js';
import { ToggleSchoolStatus } from '../../../application/use-cases/commands/toggle-school-status/toggle-school-status.js';
import { SchoolResponse } from '../dto/responses/school.response.js';
import type { UUID } from 'crypto';

@Controller('schools')
@UseGuards(AuthGuard, RolesGuard)
export class SchoolAdministrationController {
  constructor(
    private readonly replaceAdmin: ReplaceSchoolAdministratorUseCase,
    private readonly toggleStatus: ToggleSchoolStatus,
  ) {}

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

    const output = await this.replaceAdmin.handle({
      schoolId,
      newAdminUserId: dto.newAdminUserId,
      performedBy: userId,
    });
    return ReplaceAdministratorResponse.fromOutput(output);
  }

  @Patch(':id/toggle-block')
  async toggleBlock(@Param('id') id: string) {
    const output = await this.toggleStatus.handle({ schoolId: id });
    return SchoolResponse.fromOutput(output.school);
  }
}