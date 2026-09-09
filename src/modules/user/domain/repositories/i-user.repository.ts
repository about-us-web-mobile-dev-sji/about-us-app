import { User } from '../entities/user.enity.js';
import UserStatus from '../enum/user-status.enum.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  superAdminExists(): Promise<boolean>;
  save(user: User): Promise<User>;
  getAll(
    filters: UserFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<User>>;
}

export interface UserFilters {
  status?: UserStatus;
  search?: string;
  schoolId?: string;
}

export interface PaginationParams {
  page: number;   
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;      
  page: number;
  limit: number;
  totalPages: number;
}
