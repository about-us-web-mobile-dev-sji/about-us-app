import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SchoolAction } from '../../../domain/enums/school-action.enum.js';

export class UpdateSchoolRoleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;

  @IsOptional()
  @IsArray()
  @IsEnum(SchoolAction, { each: true })
  permissions?: SchoolAction[];
}
