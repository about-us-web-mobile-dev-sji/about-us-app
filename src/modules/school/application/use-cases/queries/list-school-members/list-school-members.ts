import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { toSchoolMembershipOutput } from '../../school.output.js';
import type { ListSchoolMembersInput } from './list-school-members.input.js';
import type { ListSchoolMembersOutput } from './list-school-members.output.js';
import type { UUID } from 'node:crypto';

export class ListSchoolMembersUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly memberships: SchoolMembershipRepository,
    private readonly authorization: SchoolAuthorizationService,
    private readonly users: UserAccountService,
  ) {}

  async handle(input: ListSchoolMembersInput): Promise<ListSchoolMembersOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    const actions = await this.authorization.getPermissionsFor(
      { userId: input.performedBy, globalRole: input.performedByGlobalRole },
      input.schoolId,
    );
    const full = actions.includes(SchoolAction.VIEW_MEMBER_DETAILS);
    if (!full && !actions.includes(SchoolAction.VIEW_MEMBERS)) {
      throw new SchoolMembershipActionForbiddenException();
    }

    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }

    const all = await this.memberships.findBySchool(input.schoolId);
    const rank = (role: MembershipRole) =>
      role === MembershipRole.SCHOOL_ADMIN ? 0 : 1;
    const sortAdminFirst = (list: typeof all) =>
      list.sort(
        (a, b) =>
          rank(a.role) - rank(b.role) ||
          a.grantedAt.getTime() - b.grantedAt.getTime(),
      );
    const profileOf = async (userId: string) => {
      const profile = await this.users.authenticationProfile(userId);
      return {
        email: profile?.email ?? null,
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
      };
    };

    if (!full) {
      // Reduced view: ACTIVE members only, whatever the requested status.
      const active = sortAdminFirst(
        all.filter((m) => m.status === MembershipStatus.ACTIVE),
      );
      return {
        view: 'reduced',
        members: await Promise.all(
          active.map(async (m) => {
            const { firstName, lastName } = await profileOf(m.userId);
            return { userId: m.userId, firstName, lastName, role: m.role };
          }),
        ),
      };
    }

    // Full view: every membership (administrator and caller included); only
    // REVOKED ones are hidden, unless asked for.
    const visible = sortAdminFirst(
      all.filter((m) =>
        input.status
          ? m.status === input.status
          : m.status !== MembershipStatus.REVOKED,
      ),
    );
    return {
      view: 'full',
      members: await Promise.all(
        visible.map(async (m) => ({
          ...toSchoolMembershipOutput(m),
          ...(await profileOf(m.userId)),
        })),
      ),
    };
  }
}
