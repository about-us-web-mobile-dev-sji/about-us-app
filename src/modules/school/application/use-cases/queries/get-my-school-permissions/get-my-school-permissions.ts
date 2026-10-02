import { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import type { GetMySchoolPermissionsInput } from './get-my-school-permissions.input.js';
import type { GetMySchoolPermissionsOutput } from './get-my-school-permissions.output.js';
import type { UUID } from 'node:crypto';

export class GetMySchoolPermissionsUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly memberships: SchoolMembershipRepository,
    private readonly authorization: SchoolAuthorizationService,
  ) {}

  async handle(
    input: GetMySchoolPermissionsInput,
  ): Promise<GetMySchoolPermissionsOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }

    const actor = {
      userId: input.performedBy,
      globalRole: input.performedByGlobalRole,
    };
    const membership = await this.memberships.findBySchoolAndUser(
      input.schoolId,
      input.performedBy,
    );
    if (!membership && actor.globalRole !== GlobalRole.SUPER_ADMIN) {
      throw new SchoolMembershipActionForbiddenException(
        'You are not a member of this school',
      );
    }

    return {
      role: membership?.role ?? null,
      status: membership?.status ?? null,
      actions: await this.authorization.getPermissionsFor(actor, input.schoolId),
    };
  }
}
