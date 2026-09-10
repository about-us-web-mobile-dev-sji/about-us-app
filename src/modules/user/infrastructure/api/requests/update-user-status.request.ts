import { InvalidUserException } from '../../../domain/exceptions/invalid-user.exception.js';
import { UserId } from '../../../domain/value-objects/user-id.js';
import UserStatus from '../../../domain/enum/user-status.enum.js';
import type { UpdateUserStatusInput } from '../../../application/use-cases/commands/update-user-status/update-user-status.input.js';

export class UpdateUserStatusRequest {
  status: UserStatus;

  static toInput(userId: string, request: UpdateUserStatusRequest): UpdateUserStatusInput {
    if (!request || !Object.values(UserStatus).includes(request.status))
      throw new InvalidUserException('Invalid user status');
    return {
      userId: UserId.create(userId).value,
      status: request.status,
    };
  }
}
