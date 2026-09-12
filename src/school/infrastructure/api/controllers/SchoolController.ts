import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSchool } from '../../../application/use-cases/commands/create-school/CreateSchool.js';
import { CreateSchoolInput } from '../../../application/use-cases/commands/create-school/CreateSchoolInput.js';
import { FindSchoolById } from '../../../application/use-cases/queries/find-school-by-id/FindSchoolById.js';
import { FindSchoolByIdInput } from '../../../application/use-cases/queries/find-school-by-id/FindSchoolByIdInput.js';
import { ListSchools } from '../../../application/use-cases/queries/list-schools/ListSchools.js';
import { CreateSchoolRequest } from '../requests/CreateSchoolRequest.js';
import { SchoolResponse } from '../responses/SchoolResponse.js';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/JwtAuthGuard.js';
import { RolesGuard } from '../../../../auth/infrastructure/guards/RolesGuard.js';
import { Roles } from '../../../../auth/infrastructure/decorators/Roles.js';
import { CurrentUser } from '../../../../auth/infrastructure/decorators/CurrentUser.js';
import { Role } from '../../../../shared/domain/enums/Role.js';
import { SchoolIdentifierAlreadyExistsException } from '../../../domain/exceptions/SchoolIdentifierAlreadyExistsException.js';
import { InvalidSchoolDataException } from '../../../domain/exceptions/InvalidSchoolDataException.js';
import { SchoolNotFoundException } from '../../../domain/exceptions/SchoolNotFoundException.js';

@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolController {
  constructor(
    private readonly createSchool: CreateSchool,
    private readonly findSchoolById: FindSchoolById,
    private readonly listSchools: ListSchools,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPER_ADMIN)
  async create(
    @Body() request: CreateSchoolRequest,
    @CurrentUser() user: any,
  ): Promise<SchoolResponse> {
    try {
      const input = new CreateSchoolInput(
        request.identifier,
        request.name,
        request.description,
        request.address,
        request.city,
        request.postalCode,
        request.country,
        request.mainAdministratorId || null,
        user.userId,
      );

      const output = await this.createSchool.execute(input);
      return SchoolResponse.fromCreateOutput(output);
    } catch (error) {
      if (error instanceof SchoolIdentifierAlreadyExistsException) {
        throw new ConflictException(error.message);
      }
      if (error instanceof InvalidSchoolDataException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  async findById(@Param('id') id: string): Promise<SchoolResponse> {
    try {
      const input = new FindSchoolByIdInput(id);
      const output = await this.findSchoolById.execute(input);
      return SchoolResponse.fromFindByIdOutput(output);
    } catch (error) {
      if (error instanceof SchoolNotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  async findAll() {
    const output = await this.listSchools.execute();
    return output.schools;
  }
}
