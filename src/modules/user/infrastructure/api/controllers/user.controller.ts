import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ListUsers } from '../../../application/use-cases/queries/list-users/list-users.js';
import { ListUsersRequest } from '../requests/list-users.request.js';
import { ListUsersResponse } from '../responses/list-users.response.js';
import { UpdateUserStatus } from '../../../application/use-cases/commands/update-user-status/update-user-status.js';
import { UpdateUserStatusRequest } from '../requests/update-user-status.request.js';
import { UpdateUserStatusResponse } from '../responses/update-user-status.response.js';

@Controller('users')
export class UserController {

    constructor(
        private readonly listUsers: ListUsers,
        private readonly updateUserStatusUseCase: UpdateUserStatus
    ) {}

    @Get()
    async getAllUsers(
        @Query() listUsersRequest: ListUsersRequest,
    ): Promise<ListUsersResponse> {
        const listUsersInput = ListUsersRequest.toInput(listUsersRequest);
        const listUsersOutput = await this.listUsers.listAllUsers(listUsersInput);
        return ListUsersResponse.fromOutput(listUsersOutput);
    }

    @Patch(':userId/status')
    async updateUserStatus(@Param('userId') userId: string, @Body() updateUserStatusRequest: UpdateUserStatusRequest): Promise<UpdateUserStatusResponse> {
        const input = UpdateUserStatusRequest.toInput(userId, updateUserStatusRequest);
        const output = await this.updateUserStatusUseCase.updateUserStatus(input);
        return UpdateUserStatusResponse.fromOutput(output);
    }
}