import type { SchoolMembershipOutput } from '../../../../application/use-cases/school.output.js';
import type { SchoolRole } from '../../../../domain/enums/school-role.enum.js';
import { summaryOf, type UserSummaries, type UserSummary } from '../../../../../user/application/user-directory.js';

export class MembershipResponse {
  id!: string;
  schoolId!: string;
  user!: UserSummary;
  role!: SchoolRole;
  status!: string;
  grantedBy!: UserSummary | null;
  grantedAt!: Date;
  revokedAt!: Date | null;
  revokedBy!: UserSummary | null;

  static fromOutput(output: SchoolMembershipOutput, users: UserSummaries): MembershipResponse {
    return {
      id: output.id,
      schoolId: output.schoolId,
      user: summaryOf(users, output.userId),
      role: output.role,
      status: output.status,
      grantedBy: summaryOf(users, output.grantedBy),
      grantedAt: output.grantedAt,
      revokedAt: output.revokedAt,
      revokedBy: summaryOf(users, output.revokedBy),
    };
  }

  static userIdsOf(output: SchoolMembershipOutput): (string | null)[] {
    return [output.userId, output.grantedBy, output.revokedBy];
  }
}
