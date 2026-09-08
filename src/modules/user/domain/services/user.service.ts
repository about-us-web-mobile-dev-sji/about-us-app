import { UserRepository } from "../repositories/i-user.repository.js";

export interface UserService {
  listUsers(filters: any, pagination: any): Promise<any>;
  getUserById(id: string): Promise<any>;
}