import type { School } from '../entities/school.entity.js';

export const SCHOOL_REPOSITORY = Symbol('SCHOOL_REPOSITORY');

export interface SchoolRepository {
  findById(id: string): Promise<School | null>;
  findByName(name: string): Promise<School | null>;
  existsByName(name: string): Promise<boolean>;
  save(school: School): Promise<School>;
  findAll(): Promise<School[]>;
}
