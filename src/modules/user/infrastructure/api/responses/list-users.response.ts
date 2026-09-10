import type { User } from '../../../domain/entities/user.entity.js';
import type { ListUsersOutput } from '../../../application/use-cases/queries/list-users/list-users.output.js';
import type UserStatus from '../../../domain/enum/user-status.enum.js';
import type { GlobalRole } from '../../../domain/enum/global-role.enum.js';

export class UserResponse {
  id: string | undefined;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: UserStatus;
  globalRole: GlobalRole;

  static fromUser(user: User): UserResponse {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
      globalRole: user.globalRole,
    };
  }
}

export class ListUsersResponse {
  items: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  static fromOutput(output: ListUsersOutput): ListUsersResponse {
    return {
      items: output.items.map((user) => UserResponse.fromUser(user)),
      total: output.total,
      page: output.page,
      limit: output.limit,
      totalPages: output.totalPages,
    };
  }
}
