import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SchoolRepository } from '../../../../domain/repositories/SchoolRepository.js';
import { School } from '../../../../domain/entities/School.js';
import { SchoolStatus } from '../../../../domain/enums/SchoolStatus.js';
import { SchoolIdentifierAlreadyExistsException } from '../../../../domain/exceptions/SchoolIdentifierAlreadyExistsException.js';
import { InvalidSchoolDataException } from '../../../../domain/exceptions/InvalidSchoolDataException.js';
import { AuditService } from '../../../../../audit/application/services/AuditService.js';
import { AuditAction } from '../../../../../audit/domain/enums/AuditAction.js';
import { CreateSchoolInput } from './CreateSchoolInput.js';
import { CreateSchoolOutput } from './CreateSchoolOutput.js';

@Injectable()
export class CreateSchool {
  constructor(
    private readonly schoolRepository: SchoolRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(input: CreateSchoolInput): Promise<CreateSchoolOutput> {
    // Validate input
    this.validateInput(input);

    // Check identifier uniqueness
    const existingSchool = await this.schoolRepository.findByIdentifier(input.identifier);
    if (existingSchool) {
      throw new SchoolIdentifierAlreadyExistsException(input.identifier);
    }

    // Create school domain entity
    const school = new School(
      randomUUID(),
      input.identifier,
      input.name,
      input.description,
      input.address,
      input.city,
      input.postalCode,
      input.country,
      SchoolStatus.PENDING,
      input.mainAdministratorId,
      input.createdBy,
      new Date(),
      new Date(),
    );

    // Persist
    const savedSchool = await this.schoolRepository.save(school);

    // Create audit log
    await this.auditService.log(
      AuditAction.SCHOOL_CREATED,
      'School',
      savedSchool.getId(),
      input.createdBy,
      {
        identifier: savedSchool.getIdentifier(),
        name: savedSchool.getName(),
      },
    );

    return CreateSchoolOutput.fromDomain(savedSchool);
  }

  private validateInput(input: CreateSchoolInput): void {
    if (!input.identifier || input.identifier.trim().length === 0) {
      throw new InvalidSchoolDataException('Identifier is required');
    }

    if (!input.name || input.name.trim().length === 0) {
      throw new InvalidSchoolDataException('Name is required');
    }

    if (!input.address || input.address.trim().length === 0) {
      throw new InvalidSchoolDataException('Address is required');
    }

    if (!input.city || input.city.trim().length === 0) {
      throw new InvalidSchoolDataException('City is required');
    }

    if (!input.postalCode || input.postalCode.trim().length === 0) {
      throw new InvalidSchoolDataException('Postal code is required');
    }

    if (!input.country || input.country.trim().length === 0) {
      throw new InvalidSchoolDataException('Country is required');
    }
  }
}
