import { Body, Controller, Get, Param, Patch, Post, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { CreateSchoolDto } from '../dto/create-school.dto.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { CreateSchoolUseCase } from '../../../application/use-cases/commands/create-school/create-school.js';
import { ListSchoolsUseCase } from '../../../application/use-cases/queries/list-schools/list-schools.js';
import { Roles } from '../../../../auth/infrastructure/api/decorators/roles.decorator.js';
import { GlobalRole } from '../../../../user/domain/enum/global-role.enum.js';
import { AuthGuard, type AuthenticatedRequest } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { SchoolResponseDto } from '../dto/responses/school-response.dto.js';
import { SchoolResponse } from '../dto/responses/school.response.js';
import { UpdateSchoolUseCase } from '../../../application/use-cases/commands/update-school/update-school.js';
import { UpdateSchoolDto } from '../dto/update-school.dto.js';

@Controller('schools')
@UseGuards(AuthGuard, RolesGuard)
@Roles(GlobalRole.SUPER_ADMIN)
export class SchoolController {
  constructor(
    private readonly createSchool: CreateSchoolUseCase,
    private readonly listSchools: ListSchoolsUseCase,
    private readonly updateSchool: UpdateSchoolUseCase,
  ) {}

  @Get()
  async findAll(@Req() req: AuthenticatedRequest): Promise<SchoolResponseDto[]> {
    const userId = req.auth.subjectId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const output = await this.listSchools.handle({
      userId,
      globalRole: req.auth.user.globalRole,
    });
    return SchoolResponseDto.fromOutput(output);
  }

  @Post()
  async create(@Body() dto: CreateSchoolDto, @Req() req: AuthenticatedRequest) {
    const userId = req.auth.subjectId;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const school = await this.createSchool.handle({
      name: dto.name,
      address: dto.address,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      website: dto.website,
      createdBy: userId,
    });
    return SchoolResponse.fromOutput(school);
  }

  @Patch(':id')
  @Roles(GlobalRole.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    const output = await this.updateSchool.handle({
      schoolId: id,
      name: dto.name,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      website: dto.website,
    });
    return SchoolResponse.fromOutput(output.school);
  }
}
