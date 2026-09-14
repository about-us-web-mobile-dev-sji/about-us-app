import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { ListSchoolsOutput } from './ListSchoolsOutput.js';

export class ListSchoolsUseCase {
  constructor(private readonly schools: SchoolRepository) {}

  handle(): Promise<ListSchoolsOutput> {
    return this.schools.findAll();
  }
}