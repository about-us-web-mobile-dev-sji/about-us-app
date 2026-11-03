import type { SchoolRole } from '../../../../domain/enums/school-role.enum.js';
import type { InviteSchoolMemberOutput } from '../../../../application/use-cases/commands/invite-school-member/invite-school-member.output.js';

export class InvitationResponse {
  id!: string;
  schoolId!: string;
  email!: string;
  role!: SchoolRole;
  status!: string;
  expiresAt!: Date;

  static fromOutput(output: InviteSchoolMemberOutput): InvitationResponse {
    return { ...output.invitation };
  }
}
