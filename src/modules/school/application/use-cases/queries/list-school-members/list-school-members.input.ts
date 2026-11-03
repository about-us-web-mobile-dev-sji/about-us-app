import type { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import type { SchoolRole } from '../../../../domain/enums/school-role.enum.js';
import type { PaginationParams } from '../../../../../../shared/domain/pagination.js';

export interface ListSchoolMembersInput {
  schoolId: string;
  performedBy: string;
  status?: MembershipStatus;
  role?: SchoolRole;
  search?: string;
  pagination?: PaginationParams;
}
