import { IsEmail } from 'class-validator';

// The invitee always joins as a MEMBER.
export class InviteSchoolMemberDto {
  @IsEmail()
  email!: string;
}
