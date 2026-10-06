import type { PaginationParams } from '../../../../../../shared/domain/pagination.js';
import type { UserFilters } from '../../../../domain/repositories/i-user.repository.js';

export interface ListUsersInput {
  filters?: UserFilters;
  pagination?: PaginationParams;
}