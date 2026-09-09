import { Injectable } from '@nestjs/common';
import type { ListUsersInput } from '../../../application/use-cases/queries/list-users/list-users.input.js';
import type { ListUsersOutput } from '../../../application/use-cases/queries/list-users/list-users.output.js';
import { User } from '../../../domain/entities/user.enity.js';
import UserStatus from "../../../domain/enum/user-status.enum.js";
import type { PaginationParams, UserFilters } from '../../../domain/repositories/i-user.repository.js';
import type { ListUsersRequest } from '../../api/requests/list-users.request.js';
import type { ListUsersResponse } from '../../api/responses/list-users.response.js';
import type { PUser } from '../entity/p-user.entity.js';

@Injectable()
export class UserPersistenceMapper {

    toCommandInput(userCommand: ListUsersRequest): ListUsersInput {
        const filters: UserFilters = {
            status: userCommand.status,
            search: userCommand.search,
            schoolId: userCommand.schoolId,
        };
        const pagination: PaginationParams = {
            page: Number(userCommand.page ?? 1),
            limit: Number(userCommand.limit ?? 10),
        };
        return { filters, pagination };
    }

    toDomain(pUser: PUser): User {
        return User.reconstitute({
            id: pUser.id as `${string}-${string}-${string}-${string}-${string}`,
            schoolId: pUser.schoolId,
            firstName: pUser.firstName,
            lastName: pUser.lastName,
            email: pUser.email,
            status: pUser.status as UserStatus,
        });
    }

    toResponse(listUsersOutput: ListUsersOutput): ListUsersResponse {
        return {
            items: listUsersOutput.items.map((user) => ({
                id: user.id,
                schoolId: user.schoolId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                status: user.status,
            })),
            total: listUsersOutput.total,
            page: listUsersOutput.page,
            limit: listUsersOutput.limit,
            totalPages: listUsersOutput.totalPages,
        };
    }
}