import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { MembershipRole } from '../../../domain/enums/membership-role.enum.js';

export class InviteSchoolMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;
}
