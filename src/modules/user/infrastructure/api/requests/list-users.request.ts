import UserStatus from '../../../domain/enum/user-status.enum.js';

export interface ListUsersRequest {
    status?: UserStatus;
    search?: string;
    schoolId?: string;
    page?: string;
    limit?: string;
}