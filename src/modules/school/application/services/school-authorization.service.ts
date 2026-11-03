import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { SchoolStatus } from '../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../domain/exceptions/invalid-school.exception.js';
import { SchoolNotFoundException } from '../../domain/exceptions/school-not-found.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../domain/exceptions/school-membership-action-forbidden.exception.js';
import type { School } from '../../domain/entities/school.entity.js';
import type { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import type { SchoolMembershipRepository } from '../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../domain/repositories/i-school.repository.js';
import type { UUID } from 'node:crypto';

export interface SchoolActor {
  userId: string;
  /**
   * The platform administrator, acting from outside the school. Set by the
   * HTTP layer only for the operations the platform may perform in any school
   * (inviting members); it then counts as the school administrator.
   */
  platformAdmin?: boolean;
}

// What a member may do is fixed by its role:
// - ADMIN: invite, suspend, cancel a suspension, revoke, see every member in detail;
// - MEMBER: see the other active members (reduced view).
// Only an ACTIVE membership grants anything; the global role plays no part,
// except for the platformAdmin flag above.
export class SchoolAuthorizationService {
  constructor(
    private readonly memberships: SchoolMembershipRepository,
    private readonly schools: SchoolRepository,
  ) {}

  // The actor's membership when it is ACTIVE, else null.
  async activeMembership(
    actor: SchoolActor,
    schoolId: string,
  ): Promise<SchoolMembership | null> {
    const membership = await this.memberships.findBySchoolAndUser(
      schoolId,
      actor.userId,
    );
    return membership?.status === MembershipStatus.ACTIVE ? membership : null;
  }

  async isSchoolAdmin(actor: SchoolActor, schoolId: string): Promise<boolean> {
    if (actor.platformAdmin) {
      return true;
    }
    return (await this.activeMembership(actor, schoolId))?.isAdmin ?? false;
  }

  async isActiveMember(actor: SchoolActor, schoolId: string): Promise<boolean> {
    if (actor.platformAdmin) {
      return true;
    }
    return (await this.activeMembership(actor, schoolId)) !== null;
  }

  async assertSchoolAdmin(actor: SchoolActor, schoolId: string): Promise<void> {
    if (!(await this.isSchoolAdmin(actor, schoolId))) {
      throw new SchoolMembershipActionForbiddenException(
        'Only the school administrator can perform this action',
      );
    }
  }

  // A BLOCKED school is read-only for everyone. Returns the school.
  async assertSchoolWritable(schoolId: string): Promise<School> {
    const school = await this.schools.findById(schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(schoolId);
    }
    if (school.status === SchoolStatus.BLOCKED) {
      throw new InvalidSchoolException('School is blocked, this action is not allowed');
    }
    return school;
  }

  // The administrator acts on members only, never on another administrator
  // (that goes through the administrator replacement). Acting on oneself is
  // refused by each use case with its own message.
  assertCanManageTarget(actor: SchoolActor, target: SchoolMembership | null): void {
    if (target && target.userId !== actor.userId && target.isAdmin) {
      throw new SchoolMembershipActionForbiddenException(
        'The school administrator can only be changed through the administrator replacement',
      );
    }
  }
}
