import type { ToggleSchoolStatusInput } from './toggle-school-status.input.js';
import type { ToggleSchoolStatusOutput } from './toggle-school-status.output.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SpaceRepository } from '../../../../../spaces/domain/repositories/i-space.repository.js';
import type { UUID } from 'node:crypto';
import { toSchoolOutput } from '../../school.output.js';

export class ToggleSchoolStatus {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly spaces: SpaceRepository,
  ) {}

  async handle(input: ToggleSchoolStatusInput): Promise<ToggleSchoolStatusOutput> {
    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }

    const blocking = school.status !== SchoolStatus.BLOCKED;
    if (blocking) {
      school.block();
    } else {
      school.unblock();
    }

    const saved = await this.schools.save(school);
    await this.syncSchoolSpacesStatus(saved.id as UUID, blocking);

    return { school: toSchoolOutput(saved) };
  }

  /** Bloquer une école archive tous ses espaces ; débloquer les restaure. */
  private async syncSchoolSpacesStatus(schoolId: UUID, blocking: boolean): Promise<void> {
    const tree = await this.spaces.findSchoolTree(schoolId);

    for (const space of tree) {
      if (space.isDeleted()) {
        continue;
      }

      if (blocking) {
        if (!space.isArchived()) {
          space.archive();
          await this.spaces.save(space);
        }
      } else if (space.isArchived()) {
        space.restore();
        await this.spaces.save(space);
      }
    }
  }
}
