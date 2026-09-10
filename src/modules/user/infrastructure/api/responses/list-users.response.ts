import type UserStatus from '../../../domain/enum/user-status.enum.js';

export interface UserResponse {
  id: string | undefined;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: UserStatus;
}

export interface ListUsersResponse {
  items: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}