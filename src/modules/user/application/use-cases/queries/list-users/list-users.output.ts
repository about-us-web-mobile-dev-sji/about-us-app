import { User } from '../../../../domain/entities/user.entity.js';
import { PaginatedResult } from "../../../../domain/repositories/i-user.repository.js";

export type ListUsersOutput = PaginatedResult<User>;
