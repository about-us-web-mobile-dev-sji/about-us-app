import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ListUsers } from '../../../application/use-cases/queries/list-users/list-users.js';
import type { ListUsersRequest } from '../requests/list-users.request.js';
import type { ListUsersResponse } from '../responses/list-users.response.js';
import { UserPersistenceMapper } from '../../persistence/mappers/user.persistence.mapper.js';
import { UpdateUserStatus } from '../../../application/use-cases/command/update-user-status.js';
import type { UpdateUserStatusRequest } from '../requests/update-user-status.request.js';
import type { UpdateUserStatusResponse } from '../responses/update-user-status.response.js';

@Controller('users')
export class UserController {

    constructor(
        private readonly listUsers: ListUsers,
        private readonly userPersistenceMapper: UserPersistenceMapper,
        private readonly updateUserStatusUseCase: UpdateUserStatus
    ) {}

    @Get()
    async getAllUsers(
        @Query() listUsersRequest: ListUsersRequest,
    ): Promise<ListUsersResponse> {
        const listUsersInput = this.userPersistenceMapper.toCommandInput(listUsersRequest);
        const listUsersOutput = await this.listUsers.listAllUsers(listUsersInput);
        return this.userPersistenceMapper.toResponse(listUsersOutput);
    }

    @Patch(':userId/status')
    async updateUserStatus(@Param('userId') userId: string, @Body() updateUserStatusRequest: UpdateUserStatusRequest): Promise<UpdateUserStatusResponse> {
        const input = this.userPersistenceMapper.toCommandInput(userId, updateUserStatusRequest);
        const output = await this.updateUserStatusUseCase.updateUserStatus(input);
        return this.userPersistenceMapper.toResponse(output);
    }
}