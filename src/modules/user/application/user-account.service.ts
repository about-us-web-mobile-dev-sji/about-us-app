import { GlobalRole } from '../domain/enum/global-role.enum.js';
import { ConflictException } from '@nestjs/common';
import type { UserRepository } from '../domain/repositories/i-user.repository.js';
import { User } from '../domain/entities/user.enity.js';
import UserStatus from '../domain/enum/user-status.enum.js';

export class UserAccountService {
  constructor(private readonly users: UserRepository) {}
  async requiresPasswordAuthentication(id: string): Promise<boolean> {
    return (
      (await this.users.findById(id))?.globalRole === GlobalRole.SUPER_ADMIN
    );
  }
  async exists(id: string) {
    return (await this.users.findById(id)) !== null;
  }
  async canAuthenticate(id: string) {
    return (await this.users.findById(id))?.status === UserStatus.ACTIVE;
  }
  async create(input: {
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<string> {
    if (await this.users.findByEmail(input.email)) {
      throw new ConflictException(
        'An account already uses this email; explicit account linking is required',
      );
    }
    const user = await this.users.save(User.create(input));
    return user.id!;
  }
}
