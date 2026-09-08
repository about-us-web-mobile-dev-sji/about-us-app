import { User } from "../../../../domain/entities/user.enity.js";
import { PaginatedResult } from "../../../../domain/repositories/i-user.repository.js";

export type ListUsersOutput = PaginatedResult<User>;
