import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  adminUserId!: string;
}