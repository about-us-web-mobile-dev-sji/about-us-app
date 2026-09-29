import type { SchoolMembershipOutput } from '../../../../application/use-cases/school.output.js';

export class MembershipResponse {
  id!: string;
  schoolId!: string;
  userId!: string;
  role!: string;
  status!: string;
  grantedBy!: string | null;
  grantedAt!: Date;
  revokedAt!: Date | null;
  revokedBy!: string | null;

  static fromOutput(output: SchoolMembershipOutput): MembershipResponse {
    return {
      id: output.id,
      schoolId: output.schoolId,
      userId: output.userId,
      role: output.role,
      status: output.status,
      grantedBy: output.grantedBy,
      grantedAt: output.grantedAt,
      revokedAt: output.revokedAt,
      revokedBy: output.revokedBy,
    };
  }
}
