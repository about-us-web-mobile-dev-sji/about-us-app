import UserStatus from "../../../domain/enum/user-status.enum.js";

export interface UpdateUserStatusRequest{
    status: UserStatus;
}