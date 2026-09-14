import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  Request,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { CreateSchoolUseCase } from '../../application/use-cases/commands/create-school/CreateSchool.js';
import { ToggleSchoolStatus } from '../../application/use-cases/commands/toggle-school-status/ToggleSchoolStatus.js';
import { AcceptSchoolInvitation } from '../../application/use-cases/commands/accept-school-invitation/AcceptSchoolInvitation.js';
import { AuthGuard, type AuthenticatedRequest } from '../../../auth/infrastructure/http/auth.guard.js';
import type { SchoolRepository } from '../../domain/repositories/i-school.repository.js';
import { SCHOOL_REPOSITORY } from '../../domain/repositories/i-school.repository.js';

@Controller('schools')
export class SchoolController {
  constructor(
    private readonly createSchool: CreateSchoolUseCase,
    private readonly toggleStatus: ToggleSchoolStatus,
    private readonly acceptSchoolInvitation: AcceptSchoolInvitation,
    @Inject(SCHOOL_REPOSITORY)
    private readonly schoolRepository: SchoolRepository,
  ) {}

  @Get()
  async findAll() {
    const schools = await this.schoolRepository.findAll();
    return schools.map((s) => s.toPrimitives());
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