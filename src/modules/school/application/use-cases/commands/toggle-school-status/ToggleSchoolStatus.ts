import type { ToggleSchoolStatusInput } from './ToggleSchoolStatusInput.js';
import type { ToggleSchoolStatusOutput } from './ToggleSchoolStatusOutput.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { UUID } from 'node:crypto';

export class ToggleSchoolStatus {
  constructor(private readonly schools: SchoolRepository) {}

  async handle(input: ToggleSchoolStatusInput): Promise<ToggleSchoolStatusOutput> {
    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException();
    }

    if (school.status === SchoolStatus.BLOCKED) {
      school.unblock();
    } else {
      school.block();
    }

    const saved = await this.schools.save(school);

    return { school: saved };
  }
}