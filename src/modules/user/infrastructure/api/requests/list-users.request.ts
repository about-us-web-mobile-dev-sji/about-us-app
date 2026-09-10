import { InvalidUserException } from '../../../domain/exceptions/invalid-user.exception.js';
import UserStatus from '../../../domain/enum/user-status.enum.js';
import type { ListUsersInput } from '../../../application/use-cases/queries/list-users/list-users.input.js';

export class ListUsersRequest {
  status?: UserStatus;
  search?: string;
  page?: string;
  limit?: string;

  static toInput(request: ListUsersRequest): ListUsersInput {
    if (request.status !== undefined && !Object.values(UserStatus).includes(request.status))
      throw new InvalidUserException('Invalid user status');
    if (request.search !== undefined && typeof request.search !== 'string')
      throw new InvalidUserException('Invalid user search');
    const parsePage = (value: unknown, fallback: number): number => {
      if (value === undefined) return fallback;
      if (typeof value !== 'string' || !/^[0-9]+$/.test(value))
        throw new InvalidUserException('Pagination must contain positive integers');
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < 1)
        throw new InvalidUserException('Pagination must contain positive integers');
      return parsed;
    };
    return {
      filters: { status: request.status, search: request.search },
      pagination: {
        page: parsePage(request.page, 1),
        limit: parsePage(request.limit, 10),
      },
    };
  }
}
