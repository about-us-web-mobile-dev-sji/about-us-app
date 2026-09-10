import { GlobalRole } from '../domain/enum/global-role.enum.js';
import { UserEmailAlreadyUsedException } from '../domain/exceptions/user-email-already-used.exception.js';
import type { UserRepository } from '../domain/repositories/i-user.repository.js';
import { User } from '../domain/entities/user.entity.js';
import UserStatus from '../domain/enum/user-status.enum.js';

export class UserAccountService {
  constructor(private readonly users: UserRepository) {}
  async authenticationProfile(id: string) {
    const user = await this.users.findById(id);
    return user ? { id: user.id!, email: user.email } : null;
  }
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
    const candidate = User.create(input);
    if (await this.users.findByEmail(candidate.email))
      throw new UserEmailAlreadyUsedException();
    const user = await this.users.save(candidate);
    if (!user.id) throw new Error('Repository returned an unpersisted user');
    return user.id;
  }
}
