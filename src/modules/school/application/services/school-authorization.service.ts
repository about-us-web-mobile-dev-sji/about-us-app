import { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import { SCHOOL_ACTIONS, SchoolAction } from '../../domain/enums/school-action.enum.js';
import { SchoolStatus } from '../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../domain/exceptions/invalid-school.exception.js';
import { SchoolNotFoundException } from '../../domain/exceptions/school-not-found.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { effectiveSchoolActions } from '../../domain/policies/school-permissions.js';
import type { School } from '../../domain/entities/school.entity.js';
import type { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import type { SchoolRole } from '../../domain/entities/school-role.entity.js';
import type { SchoolMembershipRepository } from '../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRoleRepository } from '../../domain/repositories/i-school-role.repository.js';
import type { SchoolRepository } from '../../domain/repositories/i-school.repository.js';
import type { UUID } from 'node:crypto';

export interface SchoolActor {
  userId: string;
  /**
   * The platform administrator, acting from outside the school. Set by the
   * HTTP layer only for the operations the platform may perform in any school
   * (inviting members, reading roles); it then holds every school action.
   */
  platformAdmin?: boolean;
}

export interface SchoolAccess {
  membership: SchoolMembership | null;
  roles: SchoolRole[];
  // Empty unless the membership is ACTIVE.
  actions: SchoolAction[];
}

// Holding any of these makes a member someone only an administrator may
// suspend, revoke or re-role.
const PROTECTED_ACTIONS: readonly SchoolAction[] = [
  SchoolAction.SUSPEND_MEMBER,
  SchoolAction.REVOKE_MEMBER,
  SchoolAction.ASSIGN_ROLES,
  SchoolAction.MANAGE_ROLES,
];

// Authorization inside a school rests only on the roles of the actor's
// membership (and its status); the global role plays no part here.
export class SchoolAuthorizationService {
  constructor(
    private readonly memberships: SchoolMembershipRepository,
    private readonly roles: SchoolRoleRepository,
    private readonly schools: SchoolRepository,
  ) {}

  async getAccess(actor: SchoolActor, schoolId: string): Promise<SchoolAccess> {
    if (actor.platformAdmin) {
      return { membership: null, roles: [], actions: [...SCHOOL_ACTIONS] };
    }
    const membership = await this.memberships.findBySchoolAndUser(
      schoolId,
      actor.userId,
    );
    if (!membership) {
      return { membership: null, roles: [], actions: [] };
    }
    const roles = await this.rolesOf(membership);
    return {
      membership,
      roles,
      actions: effectiveSchoolActions(membership.status, roles),
    };
  }

  async getPermissionsFor(
    actor: SchoolActor,
    schoolId: string,
  ): Promise<SchoolAction[]> {
    return (await this.getAccess(actor, schoolId)).actions;
  }

  async assertCan(
    actor: SchoolActor,
    action: SchoolAction,
    schoolId: string,
  ): Promise<void> {
    await this.assertCanAny(actor, [action], schoolId);
  }

  async assertCanAny(
    actor: SchoolActor,
    actions: readonly SchoolAction[],
    schoolId: string,
  ): Promise<void> {
    const { actions: held } = await this.getAccess(actor, schoolId);
    if (!actions.some((action) => held.includes(action))) {
      throw new SchoolMembershipActionForbiddenException();
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

  async isSchoolAdmin(actor: SchoolActor, schoolId: string): Promise<boolean> {
    const { membership, roles } = await this.getAccess(actor, schoolId);
    return (
      membership?.status === MembershipStatus.ACTIVE &&
      roles.some((role) => role.isAdmin)
    );
  }

  async holdsAdminRole(membership: SchoolMembership): Promise<boolean> {
    return (await this.rolesOf(membership)).some((role) => role.isAdmin);
  }

  // Except for the school administrator, nobody may act on themselves, on
  // the administrator, or on a member who can suspend / revoke / manage roles.
  async assertCanManageTarget(
    actor: SchoolActor,
    schoolId: string,
    target: SchoolMembership | null,
  ): Promise<void> {
    if (await this.isSchoolAdmin(actor, schoolId)) {
      return;
    }
    if (!target) {
      return;
    }
    if (target.userId === actor.userId) {
      throw new SchoolMembershipActionForbiddenException(
        'You cannot perform this action on yourself',
      );
    }
    const targetRoles = await this.rolesOf(target);
    if (targetRoles.some((role) => role.isAdmin)) {
      throw new SchoolMembershipActionForbiddenException(
        'Only an administrator can perform this action on a school administrator',
      );
    }
    const targetActions = effectiveSchoolActions(MembershipStatus.ACTIVE, targetRoles);
    if (PROTECTED_ACTIONS.some((action) => targetActions.includes(action))) {
      throw new SchoolMembershipActionForbiddenException(
        'Only an administrator can perform this action on a member who can suspend, revoke or manage roles',
      );
    }
  }

  // Anti-escalation: one can only hand out what one holds, and MANAGE_ROLES
  // is only ever placed in a role by the school administrator.
  async assertCanGrantPermissions(
    actor: SchoolActor,
    schoolId: string,
    permissions: readonly SchoolAction[],
  ): Promise<void> {
    if (actor.platformAdmin || (await this.isSchoolAdmin(actor, schoolId))) {
      return;
    }
    if (permissions.includes(SchoolAction.MANAGE_ROLES)) {
      throw new SchoolMembershipActionForbiddenException(
        'Only the school administrator can grant the permission to manage roles',
      );
    }
    const held = await this.getPermissionsFor(actor, schoolId);
    const missing = permissions.filter((permission) => !held.includes(permission));
    if (missing.length > 0) {
      throw new SchoolMembershipActionForbiddenException(
        `You cannot grant permissions you do not hold: ${missing.join(', ')}`,
      );
    }
  }

  private async rolesOf(membership: SchoolMembership): Promise<SchoolRole[]> {
    const roles = await this.roles.findByIds([...membership.roleIds]);
    return roles.filter((role) => role.schoolId === membership.schoolId);
  }
}
