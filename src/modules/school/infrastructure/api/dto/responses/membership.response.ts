import type {
  SchoolMembershipOutput,
  SchoolRoleSummary,
} from '../../../../application/use-cases/school.output.js';

export class MembershipResponse {
  id!: string;
  schoolId!: string;
  userId!: string;
  roleIds!: string[];
  roles?: SchoolRoleSummary[];
  status!: string;
  grantedBy!: string | null;
  grantedAt!: Date;
  revokedAt!: Date | null;
  revokedBy!: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;

  static fromOutput(
    output: SchoolMembershipOutput & {
      roles?: SchoolRoleSummary[];
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    },
  ): MembershipResponse {
    return {
      id: output.id,
      schoolId: output.schoolId,
      userId: output.userId,
      roleIds: output.roleIds,
      status: output.status,
      grantedBy: output.grantedBy,
      grantedAt: output.grantedAt,
      revokedAt: output.revokedAt,
      revokedBy: output.revokedBy,
      ...(output.roles !== undefined && { roles: output.roles }),
      ...(output.email !== undefined && { email: output.email }),
      ...(output.firstName !== undefined && { firstName: output.firstName }),
      ...(output.lastName !== undefined && { lastName: output.lastName }),
    };
  }
}
