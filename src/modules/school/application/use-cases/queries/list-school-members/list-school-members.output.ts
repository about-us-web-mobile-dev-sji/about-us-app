import type { SchoolMembershipOutput } from '../../school.output.js';
import type { SchoolRole } from '../../../../domain/enums/school-role.enum.js';
import type { PaginatedResult } from '../../../../../../shared/domain/pagination.js';

// A member's view: who the ACTIVE members are and their role, no status.
export interface SchoolMemberReducedOutput {
  userId: string;
  role: SchoolRole;
}

export type ListSchoolMembersOutput =
  | ({ view: 'full' } & PaginatedResult<SchoolMembershipOutput>)
  | ({ view: 'reduced' } & PaginatedResult<SchoolMemberReducedOutput>);
