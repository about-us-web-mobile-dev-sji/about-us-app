import { GlobalRole } from '../../../user/domain/enum/global-role.enum.js';
import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../domain/enums/school-action.enum.js';
import { SchoolStatus } from '../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../domain/exceptions/invalid-school.exception.js';
import { SchoolNotFoundException } from '../../domain/exceptions/school-not-found.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { effectiveSchoolActions } from '../../domain/policies/school-role-permissions.js';
import { MembershipRole } from '../../domain/enums/membership-role.enum.js';
import type { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import type { SchoolMembershipRepository } from '../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../domain/repositories/i-school.repository.js';
import type { UUID } from 'node:crypto';

export interface SchoolActor {
  userId: string;
  globalRole: GlobalRole;
}

export class SchoolAuthorizationService {
  constructor(
    private readonly memberships: SchoolMembershipRepository,
    private readonly schools: SchoolRepository,
  ) {}

  async assertCan(
    actor: SchoolActor,
    action: SchoolAction,
    schoolId: string,
  ): Promise<void> {
    if (actor.globalRole === GlobalRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.memberships.findBySchoolAndUser(
      schoolId,
      actor.userId,
    );
    const allowed =
      !!membership &&
      effectiveSchoolActions(membership).includes(action);

    if (!allowed) {
      throw new SchoolMembershipActionForbiddenException();
    }
  }

  // Effective actions: role permissions ∪ delegated ones, ACTIVE membership
  // only. A super admin holds every action.
  async getPermissionsFor(
    actor: SchoolActor,
    schoolId: string,
  ): Promise<SchoolAction[]> {
    if (actor.globalRole === GlobalRole.SUPER_ADMIN) {
      return Object.values(SchoolAction);
    }
    const membership = await this.memberships.findBySchoolAndUser(
      schoolId,
      actor.userId,
    );
    return membership ? effectiveSchoolActions(membership) : [];
  }

  // Delegates (neither super admin nor school admin) may not act on
  // themselves, on an administrator, or on a peer who can suspend / revoke.
  async assertCanManageTarget(
    actor: SchoolActor,
    schoolId: string,
    targetUserId: string,
    target: SchoolMembership | null,
  ): Promise<void> {
    if (actor.globalRole === GlobalRole.SUPER_ADMIN) {
      return;
    }
    const actorMembership = await this.memberships.findBySchoolAndUser(
      schoolId,
      actor.userId,
    );
    if (
      actorMembership?.status === MembershipStatus.ACTIVE &&
      actorMembership.role === MembershipRole.SCHOOL_ADMIN
    ) {
      return;
    }

    if (targetUserId === actor.userId) {
      throw new SchoolMembershipActionForbiddenException(
        'You cannot perform this action on yourself',
      );
    }
    if (!target) {
      return;
    }
    if (target.role === MembershipRole.SCHOOL_ADMIN) {
      throw new SchoolMembershipActionForbiddenException(
        'Only an administrator can perform this action on a school administrator',
      );
    }
    if (
      target.grantedPermissions.includes(SchoolAction.SUSPEND_MEMBER) ||
      target.grantedPermissions.includes(SchoolAction.REVOKE_MEMBER)
    ) {
      throw new SchoolMembershipActionForbiddenException(
        'Only an administrator can perform this action on a member who can suspend or revoke members',
      );
    }
  }

  // A BLOCKED school is read-only for everyone but the global SUPER_ADMIN.
  async assertSchoolWritable(actor: SchoolActor, schoolId: string): Promise<void> {
    if (actor.globalRole === GlobalRole.SUPER_ADMIN) {
      return;
    }
    const school = await this.schools.findById(schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(schoolId);
    }
    if (school.status === SchoolStatus.BLOCKED) {
      throw new InvalidSchoolException('School is blocked, this action is not allowed');
    }
  }
}
