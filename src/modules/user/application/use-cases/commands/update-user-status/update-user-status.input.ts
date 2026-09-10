import { UUID } from "crypto";
import UserStatus from "../../../../domain/enum/user-status.enum.js";

export interface UpdateUserStatusInput {
    userId: UUID;
    status: UserStatus;
}