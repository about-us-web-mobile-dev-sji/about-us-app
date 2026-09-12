import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateSchoolRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country!: string;

  @IsOptional()
  @IsUUID()
  mainAdministratorId?: string;
}
