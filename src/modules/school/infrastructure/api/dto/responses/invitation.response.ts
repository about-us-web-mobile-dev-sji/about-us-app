import type { InviteSchoolMemberOutput } from '../../../../application/use-cases/commands/invite-school-member/invite-school-member.output.js';

export class InvitationResponse {
  id!: string;
  schoolId!: string;
  email!: string;
  role!: string;
  status!: string;
  expiresAt!: Date;

  static fromOutput(output: InviteSchoolMemberOutput): InvitationResponse {
    return { ...output.invitation };
  }
}
