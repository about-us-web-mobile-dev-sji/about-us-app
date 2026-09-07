import { User } from '../entities/user.enity.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  superAdminExists(): Promise<boolean>;
  save(user: User): Promise<User>;
}
