import { Injectable } from '@nestjs/common';
import type { ListUsersInput } from '../../../application/use-cases/queries/list-users/list-users.input.js';
import type { ListUsersOutput } from '../../../application/use-cases/queries/list-users/list-users.output.js';
import type { PaginationParams, UserFilters } from '../../../domain/repositories/i-user.repository.js';
import type { ListUsersRequest } from '../../api/requests/list-users.request.js';
import type { ListUsersResponse } from '../../api/responses/list-users.response.js';
import type { UpdateUserStatusInput } from '../../../application/use-cases/command/update-user-status.input.js';
import { UpdateUserStatusRequest } from '../../api/requests/update-user-status.request.js';
import { UpdateUserStatusOutput } from '../../../application/use-cases/command/update-user-status.output.js';
import { UpdateUserStatusResponse } from '../../api/responses/update-user-status.response.js';

@Injectable()
export class UserPersistenceMapper {

    toCommandInput(userCommand: ListUsersRequest): ListUsersInput;
    toCommandInput(userId: string, updateUserStatusRequest: UpdateUserStatusRequest): UpdateUserStatusInput;

    toCommandInput(param: ListUsersRequest | string, updateUserStatusRequest?: UpdateUserStatusRequest): ListUsersInput | UpdateUserStatusInput {
        if (typeof param === 'string') {
            if (!updateUserStatusRequest) throw new Error('Le statut utilisateur est requis');

            return {
                userId: param as `${string}-${string}-${string}-${string}-${string}`,
                status: updateUserStatusRequest.status,
            };
        }

        const filters: UserFilters = {
            status: param.status,
            search: param.search,
        };

        const pagination: PaginationParams = {
            page: Number(param.page ?? 1),
            limit: Number(param.limit ?? 10),
        };

        return { filters, pagination };
    }

    toResponse(listUsersOutput: ListUsersOutput): ListUsersResponse;
    toResponse(updateUserStatusOutput: UpdateUserStatusOutput): UpdateUserStatusResponse;

    toResponse(output: ListUsersOutput | UpdateUserStatusOutput): ListUsersResponse | UpdateUserStatusResponse {
        if ('user' in output) {
            return {
                user: output.user,
            };
        }

        return {
            items: output.items.map((user) => ({
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                status: user.status,
            })), 
            total: output.total,
            page: output.page,
            limit: output.limit,
            totalPages: output.totalPages,
        };
    }


}