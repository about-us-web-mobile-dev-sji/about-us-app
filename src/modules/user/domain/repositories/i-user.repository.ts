import { User } from '../entities/user.entity.js';
import UserStatus from '../enum/user-status.enum.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findSuperAdmin(): Promise<User | null>;
  superAdminExists(): Promise<boolean>;
  getAll(filters: UserFilters, pagination: PaginationParams): Promise<PaginatedResult<User>>;
  createInitialSuperAdmin(input: {
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User>;
  save(user: User): Promise<User>;
}

export interface UserFilters {
  status?: UserStatus;
  search?: string;
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
