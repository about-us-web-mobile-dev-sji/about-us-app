import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;
}
