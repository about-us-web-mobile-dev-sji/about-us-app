import type { SchoolMembershipOutput, SchoolRoleSummary } from '../../school.output.js';
import type { PaginatedResult } from '../../../../../../shared/domain/pagination.js';

// VIEW_MEMBERS only: name and roles of ACTIVE members, no email or status.
export interface SchoolMemberReducedOutput {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  roles: SchoolRoleSummary[];
}

// VIEW_MEMBER_DETAILS: every membership with its roles and profile.
export interface SchoolMemberFullOutput extends SchoolMembershipOutput {
  roles: SchoolRoleSummary[];
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export type ListSchoolMembersOutput =
  | ({ view: 'full' } & PaginatedResult<SchoolMemberFullOutput>)
  | ({ view: 'reduced' } & PaginatedResult<SchoolMemberReducedOutput>);
