import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto.js';
import { CreateSchoolUseCase } from '../../application/use-cases/commands/create-school/CreateSchool.js';
import { ListSchoolsUseCase } from '../../application/use-cases/queries/list-schools/ListSchools.js';
import { AuthGuard, type AuthenticatedRequest } from '../../../auth/infrastructure/http/auth.guard.js';
import { SchoolResponseDto } from './dto/school-response.dto.js';

@Controller('schools')
export class SchoolController {
  constructor(
    private readonly createSchool: CreateSchoolUseCase,
    private readonly listSchools: ListSchoolsUseCase,
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
}
