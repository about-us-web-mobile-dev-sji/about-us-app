import type { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import type { PaginationParams } from '../../../../../../shared/domain/pagination.js';

export interface ListSchoolMembersInput {
  schoolId: string;
  performedBy: string;
  status?: MembershipStatus;
  roleId?: string;
  search?: string;
  pagination?: PaginationParams;
}
