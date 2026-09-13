import type { CreateSchoolInput } from './CreateSchoolInput.js';
import type { CreateSchoolOutput } from './CreateSchoolOutput.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolNameAlreadyExistsException } from '../../../../domain/exceptions/school-name-already-exists.exception.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';

export class CreateSchoolUseCase {
  constructor(private readonly schools: SchoolRepository) {}

  async handle(input: CreateSchoolInput): Promise<CreateSchoolOutput> {
    // Validate required fields
    if (!input.name?.trim()) {
      throw new InvalidSchoolException('School name is required');
    }

    if (!input.createdBy?.trim()) {
      throw new InvalidSchoolException('createdBy is required');
    }

    // Check if school name already exists
    const existingSchool = await this.schools.findByName(input.name.trim());
    if (existingSchool) {
      throw new SchoolNameAlreadyExistsException();
    }

    // Create school entity
    const school = School.create({
      name: input.name,
      address: input.address,
      city: input.city,
      postalCode: input.postalCode,
      country: input.country,
      phoneNumber: input.phoneNumber,
      email: input.email,
      website: input.website,
      adminUserId: input.adminUserId,
      createdBy: input.createdBy,
    });

    // Persist school
    const savedSchool = await this.schools.save(school);
    const primitives = savedSchool.toPrimitives();
    if (!primitives.id) throw new Error('Repository returned an unpersisted school');

    return {
      id: primitives.id,
      name: primitives.name,
      address: primitives.address,
      city: primitives.city,
      postalCode: primitives.postalCode,
      country: primitives.country,
      phoneNumber: primitives.phoneNumber,
      email: primitives.email,
      website: primitives.website,
      status: primitives.status,
      adminUserId: primitives.adminUserId,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
      createdBy: primitives.createdBy,
    };
  }
}
