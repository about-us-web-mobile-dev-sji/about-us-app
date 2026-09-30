import { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { ListSchoolsOutput } from './list-schools.output.js';
import { toSchoolOutput } from '../../school.output.js';

export interface ListSchoolsActor {
  userId: string;
  globalRole: GlobalRole;
}

export class ListSchoolsUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly memberships: SchoolMembershipRepository,
  ) {}

  async handle(actor: ListSchoolsActor): Promise<ListSchoolsOutput> {
    if (actor.globalRole === GlobalRole.SUPER_ADMIN) {
      const all = await this.schools.findAll();
      return { schools: all.map(toSchoolOutput) };
    }

    const active = await this.memberships.findActiveByUser(actor.userId);
    const schoolIds = [...new Set(active.map((m) => m.schoolId))];
    const visible = await this.schools.findByIds(schoolIds);
    return { schools: visible.map(toSchoolOutput) };
  }
}
