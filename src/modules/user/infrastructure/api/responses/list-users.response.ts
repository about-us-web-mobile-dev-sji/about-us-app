import type UserStatus from '../../../domain/enum/user-status.enum.js';
import type { GlobalRole } from '../../../domain/enum/global-role.enum.js';

export interface UserResponse {
  id: string | undefined;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: UserStatus;
  globalRole: GlobalRole;
}

export interface ListUsersResponse {
  items: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}