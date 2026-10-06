import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class InviteSchoolMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;
}
