import { PaginationParams, UserFilters } from "../../../../domain/repositories/i-user.repository.js";

export interface ListUsersInput {
  filters?: UserFilters;
  pagination?: PaginationParams;
}