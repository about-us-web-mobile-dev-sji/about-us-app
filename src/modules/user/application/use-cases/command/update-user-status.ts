import { Inject, Injectable } from "@nestjs/common";
import { USER_REPOSITORY, type UserRepository } from "../../../domain/repositories/i-user.repository.js";
import { UpdateUserStatusInput } from "./update-user-status.input.js";
import { UpdateUserStatusOutput } from "./update-user-status.output.js";
import UserStatus from "../../../domain/enum/user-status.enum.js";
import type { UserStatusEventsGateway } from '../../gateway/user-status-events.gateway.js';
import { UserStatusUpdatedEvent } from '../../../domain/events/user-status-updated.event.js';

@Injectable()
export class UpdateUserStatus {
    constructor(
            @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
            private readonly events: UserStatusEventsGateway,
        ) {}

    async updateUserStatus (updateUserStatusInput: UpdateUserStatusInput): Promise<UpdateUserStatusOutput>{
        let user = await this.userRepository.findById(updateUserStatusInput.userId);
        
        if (user === null) throw new Error('Utilisateur introuvable');

        const previousStatus = user.status;
  
        if (updateUserStatusInput.status === UserStatus.ACTIVE) {
            user.activate();
        } else if (updateUserStatusInput.status === UserStatus.SUSPENDED) {
            user.block();
        }

        const updatedUser = await this.userRepository.save(user);

        if (updatedUser.id && previousStatus !== updatedUser.status) {
            await this.events.publish(
                new UserStatusUpdatedEvent(
                    updatedUser.id,
                    previousStatus,
                    updatedUser.status,
                ),
            );
        }

        return {
            user: updatedUser,
        };
    }
}