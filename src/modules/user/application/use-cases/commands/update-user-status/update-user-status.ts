import { UserNotFoundException } from '../../../../domain/exceptions/user-not-found.exception.js';
import { InvalidUserException } from '../../../../domain/exceptions/invalid-user.exception.js';
import { UserId } from '../../../../domain/value-objects/user-id.js';
import { Inject, Injectable } from "@nestjs/common";
import { USER_REPOSITORY, type UserRepository } from "../../../../domain/repositories/i-user.repository.js";
import { UpdateUserStatusInput } from "./update-user-status.input.js";
import { UpdateUserStatusOutput } from "./update-user-status.output.js";
import UserStatus from "../../../../domain/enum/user-status.enum.js";

@Injectable()
export class UpdateUserStatus {
    constructor(
            @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
        ) {}

    async updateUserStatus (updateUserStatusInput: UpdateUserStatusInput): Promise<UpdateUserStatusOutput>{
        if (!Object.values(UserStatus).includes(updateUserStatusInput.status))
            throw new InvalidUserException('Invalid user status');
        const id = UserId.create(updateUserStatusInput.userId).value;
        const user = await this.userRepository.findById(id);
        
        if (user === null) throw new UserNotFoundException();
  
        if (updateUserStatusInput.status === UserStatus.ACTIVE) {
            user.activate();
        } else if (updateUserStatusInput.status === UserStatus.SUSPENDED) {
            user.block();
        }

        const updatedUser = await this.userRepository.save(user);

        return {
            user: updatedUser,
        };
    }
}