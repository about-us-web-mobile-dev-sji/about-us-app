import type { User } from '../../../../domain/entities/user.entity.js';
import type { PaginatedResult } from '../../../../../../shared/domain/pagination.js';

export type ListUsersOutput = PaginatedResult<User>;
