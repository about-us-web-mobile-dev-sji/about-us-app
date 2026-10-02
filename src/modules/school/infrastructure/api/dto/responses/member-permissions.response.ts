import type { SchoolMembershipOutput } from '../../../../application/use-cases/school.output.js';

export class MemberPermissionsResponse {
  userId!: string;
  role!: string;
  status!: string;
  grantedPermissions!: string[];

  static fromMembership(m: SchoolMembershipOutput): MemberPermissionsResponse {
    return {
      userId: m.userId,
      role: m.role,
      status: m.status,
      grantedPermissions: m.grantedPermissions,
    };
  }
}
