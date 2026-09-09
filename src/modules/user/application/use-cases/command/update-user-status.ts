import { Inject, Injectable } from "@nestjs/common";
import { USER_REPOSITORY, type UserRepository } from "../../../domain/repositories/i-user.repository.js";
import { UpdateUserStatusInput } from "./update-user-status.input.js";
import { UpdateUserStatusOutput } from "./update-user-status.output.js";
import UserStatus from "../../../domain/enum/user-status.enum.js";

const UPDATE_USER_STATUS_USECASE = Symbol('UPDATE_USER_STATUS_USECASE');

@Injectable()
export class UpdateUserStatus {
    constructor(
            @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
        ) {}

    async updateUserStatus (updateUserStatusInput: UpdateUserStatusInput): Promise<UpdateUserStatusOutput>{
        let user = await this.userRepository.findById(updateUserStatusInput.userId);
        
        if (user === null) throw new Error('Utilisateur introuvable');
  
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