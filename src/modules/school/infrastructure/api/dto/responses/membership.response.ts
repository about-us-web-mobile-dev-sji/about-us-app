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
  grantedPermissions!: string[];
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;

  static fromOutput(
    output: SchoolMembershipOutput & {
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    },
  ): MembershipResponse {
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
      grantedPermissions: output.grantedPermissions,
      ...(output.email !== undefined && { email: output.email }),
      ...(output.firstName !== undefined && { firstName: output.firstName }),
      ...(output.lastName !== undefined && { lastName: output.lastName }),
    };
  }
}
