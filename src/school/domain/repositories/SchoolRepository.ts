import { School } from '../entities/School.js';

export interface SchoolRepository {
  save(school: School): Promise<School>;
  findById(id: string): Promise<School | null>;
  findByIdentifier(identifier: string): Promise<School | null>;
  findAll(): Promise<School[]>;
  delete(id: string): Promise<void>;
}
