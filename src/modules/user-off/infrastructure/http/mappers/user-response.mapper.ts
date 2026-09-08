import type { User } from '../../../domain/entities/user.entity.js';
import { UserResponseDto } from '../dto/user-response.dto.js';
export class UserResponseMapper {
  static toDto(user: User): UserResponseDto {
    if (!user.id) throw new Error('Cannot expose an unpersisted user');
    return new UserResponseDto(
      user.id,
      user.email,
      user.firstName,
      user.lastName,
      user.status,
      user.globalRole,
    );
  }
}
