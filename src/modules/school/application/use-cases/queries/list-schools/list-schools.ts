import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { ListSchoolsOutput } from './list-schools.output.js';
import { toSchoolOutput } from '../../school.output.js';

export class ListSchoolsUseCase {
  constructor(private readonly schools: SchoolRepository) {}

  async handle(): Promise<ListSchoolsOutput> {
    const schools = await this.schools.findAll();
    return { schools: schools.map(toSchoolOutput) };
  }
}