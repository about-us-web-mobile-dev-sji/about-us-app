import {
  Controller,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ReplaceSchoolAdministrator } from '../../../application/use-cases/commands/replace-school-administrator/ReplaceSchoolAdministrator.js';
import { ReplaceSchoolAdministratorInput } from '../../../application/use-cases/commands/replace-school-administrator/ReplaceSchoolAdministratorInput.js';
import { ReplaceAdministratorRequest } from '../requests/ReplaceAdministratorRequest.js';
import { ReplaceAdministratorResponse } from '../responses/MembershipResponse.js';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/JwtAuthGuard.js';
import { RolesGuard } from '../../../../auth/infrastructure/guards/RolesGuard.js';
import { Roles } from '../../../../auth/infrastructure/decorators/Roles.js';
import { CurrentUser } from '../../../../auth/infrastructure/decorators/CurrentUser.js';
import { Role } from '../../../../shared/domain/enums/Role.js';
import { SchoolNotFoundException } from '../../../../school/domain/exceptions/SchoolNotFoundException.js';
import { UserNotFoundException } from '../../../../user/domain/exceptions/UserNotFoundException.js';
import { InvitationAlreadyExistsException } from '../../../../school-invitation/domain/exceptions/InvitationAlreadyExistsException.js';

@Controller('schools/:schoolId')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolMembershipController {
  constructor(private readonly replaceSchoolAdministrator: ReplaceSchoolAdministrator) {}

  @Put('administrator')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN)
  async replaceAdministrator(
    @Param('schoolId') schoolId: string,
    @Body() request: ReplaceAdministratorRequest,
    @CurrentUser() user: any,
  ): Promise<ReplaceAdministratorResponse> {
    try {
      // Validate that either ID or email is provided
      if (!request.newAdministratorId && !request.newAdministratorEmail) {
        throw new BadRequestException(
          'Either newAdministratorId or newAdministratorEmail must be provided',
        );
      }

      if (request.newAdministratorId && request.newAdministratorEmail) {
        throw new BadRequestException(
          'Provide either newAdministratorId or newAdministratorEmail, not both',
        );
      }

      const input = new ReplaceSchoolAdministratorInput(
        schoolId,
        request.newAdministratorId || null,
        request.newAdministratorEmail || null,
        user.userId,
      );

      const output = await this.replaceSchoolAdministrator.execute(input);

      return new ReplaceAdministratorResponse(
        output.schoolId,
        output.previousAdministratorId,
        output.newAdministratorId,
        output.invitationSent,
        output.replacedAt,
      );
    } catch (error) {
      if (error instanceof SchoolNotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof UserNotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof InvitationAlreadyExistsException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
