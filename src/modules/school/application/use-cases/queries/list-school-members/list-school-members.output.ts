import type { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import type { SchoolMembershipOutput } from '../../school.output.js';

// VIEW_MEMBERS only: name and role of ACTIVE members, no email, no status.
export interface SchoolMemberReducedOutput {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  role: MembershipRole;
}

// VIEW_MEMBER_DETAILS, school admin, super admin.
export interface SchoolMemberFullOutput extends SchoolMembershipOutput {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export type ListSchoolMembersOutput =
  | { view: 'full'; members: SchoolMemberFullOutput[] }
  | { view: 'reduced'; members: SchoolMemberReducedOutput[] };
