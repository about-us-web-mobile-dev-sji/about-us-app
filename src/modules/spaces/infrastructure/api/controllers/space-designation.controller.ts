import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../../auth/infrastructure/api/guard/auth.guard.js';
import { RolesGuard } from '../../../../auth/infrastructure/api/guard/roles.guard.js';
import { GetSpacesByDesignationKeyQueryDto, GetSpacesByDesignationKeyOutput } from '../dto/space.dto.js';
import { SpaceResponseDto, PaginatedResponseDto } from '../dto/space.dto.js';
import { GetSpacesByDesignationKeyUseCase } from '../../../application/use-cases/queries/get-spaces-by-designation-key/get-spaces-by-designation-key.js';
import type { UUID } from 'node:crypto';

@ApiTags('spaces')
@Controller('spaces')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class SpaceDesignationController {
  constructor(private readonly getByDesignationKeyUseCase: GetSpacesByDesignationKeyUseCase) {}

  @Get('by-designation-key')
  @ApiOperation({ summary: 'Get spaces filtered by designation key' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto<SpaceResponseDto> })
  async getByDesignationKey(@Query() query: GetSpacesByDesignationKeyQueryDto) {
    const result = await this.getByDesignationKeyUseCase.handle({
      schoolId: query.schoolId as UUID,
      designationKey: query.designationKey,
      page: query.page,
      limit: query.limit,
    });
    return result;
  }
}