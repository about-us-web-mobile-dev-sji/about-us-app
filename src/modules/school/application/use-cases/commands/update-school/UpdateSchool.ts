import type { UUID } from 'node:crypto';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import { SchoolNameAlreadyExistsException } from '../../../../domain/exceptions/school-name-already-exists.exception.js';
import type { UpdateSchoolInput } from './UpdateSchoolInput.js';
import type { UpdateSchoolOutput } from './UpdateSchoolOutput.js';

export class UpdateSchoolUseCase {
  constructor(private readonly schools: SchoolRepository) {}

  async handle(input: UpdateSchoolInput): Promise<UpdateSchoolOutput> {
    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }

    const nextName = input.name?.trim();
    if (nextName && nextName !== school.name) {
      const alreadyExists = await this.schools.existsByName(nextName);
      if (alreadyExists) {
        throw new SchoolNameAlreadyExistsException();
      }
    }

    school.update({
      name: input.name,
      address: input.address,
      city: input.city,
      postalCode: input.postalCode,
      country: input.country,
      phoneNumber: input.phoneNumber,
      email: input.email,
      website: input.website,
    });

    const saved = await this.schools.save(school);

    return { school: saved };
  }
}