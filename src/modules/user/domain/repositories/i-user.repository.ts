import { User } from '../entities/user.entity.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findSuperAdmin(): Promise<User | null>;
  superAdminExists(): Promise<boolean>;
  /** Atomically return any existing SUPER_ADMIN, or create the initial one.
   * Reject an email already owned by an ordinary account; never promote it implicitly.
   */
  createInitialSuperAdmin(input: {
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User>;
  save(user: User): Promise<User>;
}
