import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto.js';
import { CreateSchoolUseCase } from '../../application/use-cases/commands/create-school/CreateSchool.js';
import { Roles } from '../../../auth/infrastructure/http/decorators/roles.decorator.js';
import { GlobalRole } from '../../../user-off/domain/enum/global-role.enum.js';

@Controller('schools')
export class SchoolController {
  constructor(private readonly createSchool: CreateSchoolUseCase) {}

  @Post()
  @Roles(GlobalRole.SUPER_ADMIN)
  async create(@Body() dto: CreateSchoolDto, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    
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
