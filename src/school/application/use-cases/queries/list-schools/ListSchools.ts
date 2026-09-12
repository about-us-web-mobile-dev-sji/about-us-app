import { Injectable } from '@nestjs/common';
import { SchoolRepository } from '../../../../domain/repositories/SchoolRepository.js';
import { ListSchoolsOutput } from './ListSchoolsOutput.js';

@Injectable()
export class ListSchools {
  constructor(private readonly schoolRepository: SchoolRepository) {}

  async execute(): Promise<ListSchoolsOutput> {
    const schools = await this.schoolRepository.findAll();
    return ListSchoolsOutput.fromDomain(schools);
  }
}
