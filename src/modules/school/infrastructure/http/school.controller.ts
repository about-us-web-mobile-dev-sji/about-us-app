import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto.js';
import { CreateSchoolUseCase } from '../../application/use-cases/commands/create-school/CreateSchool.js';
import { AuthGuard, type AuthenticatedRequest } from '../../../auth/infrastructure/http/auth.guard.js';

@Controller('schools')
export class SchoolController {
  constructor(private readonly createSchool: CreateSchoolUseCase) {}

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
