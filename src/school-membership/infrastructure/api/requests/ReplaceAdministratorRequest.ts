import { IsUUID, IsEmail, IsOptional, ValidateIf } from 'class-validator';

export class ReplaceAdministratorRequest {
  @IsOptional()
  @IsUUID()
  @ValidateIf((o) => !o.newAdministratorEmail)
  newAdministratorId?: string;

  @IsOptional()
  @IsEmail()
  @ValidateIf((o) => !o.newAdministratorId)
  newAdministratorEmail?: string;
}
