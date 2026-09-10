import { UserResponse } from './list-users.response.js';
import type { UpdateUserStatusOutput } from '../../../application/use-cases/commands/update-user-status/update-user-status.output.js';

export class UpdateUserStatusResponse {
  user: UserResponse;

  static fromOutput(output: UpdateUserStatusOutput): UpdateUserStatusResponse {
    return { user: UserResponse.fromUser(output.user) };
  }
}
