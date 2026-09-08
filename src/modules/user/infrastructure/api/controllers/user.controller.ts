import { Controller, Get, Query } from '@nestjs/common';
import { ListUsers } from '../../../application/use-cases/queries/list-users/list-users.js';
import type { ListUsersRequest } from '../requests/list-users.request.js';
import type { ListUsersResponse } from '../responses/list-users.response.js';
import { UserPersistenceMapper } from '../../persistence/mappers/user.persistence.mapper.js';

@Controller('users')
export class UserController {

    constructor(
        private readonly listUsers: ListUsers,
        private readonly userPersistenceMapper: UserPersistenceMapper,
    ) {}

    @Get()
    async getAllUsers(
        @Query() listUsersRequest: ListUsersRequest,
    ): Promise<ListUsersResponse> {
        const listUsersInput = this.userPersistenceMapper.toCommandInput(listUsersRequest);
        const listUsersOutput = await this.listUsers.listAllUsers(listUsersInput);
        return this.userPersistenceMapper.toResponse(listUsersOutput);
    }
}