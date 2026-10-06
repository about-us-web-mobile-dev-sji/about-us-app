import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { SchoolNameAlreadyExistsException } from '../../../../domain/exceptions/school-name-already-exists.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import { toSchoolOutput } from '../../school.output.js';
import type { UpdateSchoolInput } from './update-school.input.js';
import type { UpdateSchoolOutput } from './update-school.output.js';
import type { UUID } from 'node:crypto';

export class UpdateSchoolUseCase {
  constructor(private readonly schools: SchoolRepository) {}

  async handle(input: UpdateSchoolInput): Promise<UpdateSchoolOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolException('School ID is required');
    }
    if (
      input.name === undefined &&
      input.phoneNumber === undefined &&
      input.email === undefined &&
      input.website === undefined
    ) {
      throw new InvalidSchoolException('At least one school field must be provided');
    }

    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }

    if (input.name !== undefined) {
      const normalizedName = input.name.trim();
      const duplicate = await this.schools.findByName(normalizedName);
      if (duplicate && duplicate.id !== school.id) {
        throw new SchoolNameAlreadyExistsException();
      }
    }

    school.updateDetails({
      name: input.name,
      phoneNumber: input.phoneNumber,
      email: input.email,
      website: input.website,
    });
    return { school: toSchoolOutput(await this.schools.save(school)) };
  }
}