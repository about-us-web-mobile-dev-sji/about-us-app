import { Controller, Get, Post, Body, Patch, Param, Request, Inject } from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { CreateSchoolUseCase } from '../../application/use-cases/commands/create-school/CreateSchool.js';
import { ToggleSchoolStatus } from '../../application/use-cases/commands/toggle-school-status/ToggleSchoolStatus.js';
import { AcceptSchoolInvitation } from '../../application/use-cases/commands/accept-school-invitation/AcceptSchoolInvitation.js';
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
  async create(@Body() dto: CreateSchoolDto, @Request() req: any) {
    // Utilise l'ID authentifié ou un identifiant système par défaut pour éviter le plantage 500
    const userId = req.user?.sub || req.user?.id || dto.adminUserId || '00000000-0000-0000-0000-000000000000';

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