import { User } from '../entities/User.js';
import { Email } from '../../../shared/domain/value-objects/Email.js';

export interface UserRepository {
  save(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findAll(): Promise<User[]>;
  delete(id: string): Promise<void>;
}
