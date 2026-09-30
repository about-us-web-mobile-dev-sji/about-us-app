import { IsEnum } from 'class-validator';
import { MembershipRole } from '../../../domain/enums/membership-role.enum.js';

export class ChangeSchoolMemberRoleDto {
  @IsEnum(MembershipRole)
  role!: MembershipRole;
}
