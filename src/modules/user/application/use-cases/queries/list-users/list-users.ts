import { Inject, Injectable } from '@nestjs/common';
import type { ListUsersInput } from './list-users.input.js';
import type { ListUsersOutput } from './list-users.output.js';
import { USER_REPOSITORY, type UserRepository } from '../../../../domain/repositories/i-user.repository.js';

export const LIST_USERS_USECASE = Symbol('LIST_USERS_USECASE');

@Injectable()
export class ListUsers {
    constructor(
        @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    ) {}

    async listAllUsers(listUsersInput: ListUsersInput): Promise<ListUsersOutput>{
        let filters = listUsersInput.filters || {};
        let pagination = listUsersInput.pagination || { page: 1, limit: 10 };
        return this.userRepository.getAll(filters, pagination);
    }
}