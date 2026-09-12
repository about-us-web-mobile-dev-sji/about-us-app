import { Injectable } from '@nestjs/common';
import { SchoolRepository } from '../../../../domain/repositories/SchoolRepository.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/SchoolNotFoundException.js';
import { FindSchoolByIdInput } from './FindSchoolByIdInput.js';
import { FindSchoolByIdOutput } from './FindSchoolByIdOutput.js';

@Injectable()
export class FindSchoolById {
  constructor(private readonly schoolRepository: SchoolRepository) {}

  async execute(input: FindSchoolByIdInput): Promise<FindSchoolByIdOutput> {
    const school = await this.schoolRepository.findById(input.id);

    if (!school) {
      throw new SchoolNotFoundException(input.id);
    }

    return FindSchoolByIdOutput.fromDomain(school);
  }
}
