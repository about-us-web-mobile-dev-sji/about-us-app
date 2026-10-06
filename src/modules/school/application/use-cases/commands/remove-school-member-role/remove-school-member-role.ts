import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { SchoolRoleNotFoundException } from '../../../../domain/exceptions/school-role-not-found.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRoleRepository } from '../../../../domain/repositories/i-school-role.repository.js';
import { SchoolMemberRoleChangedEvent } from '../../../events/school-member-role-changed.event.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { toSchoolMembershipOutput } from '../../school.output.js';
import type { RemoveSchoolMemberRoleInput } from './remove-school-member-role.input.js';
import type { RemoveSchoolMemberRoleOutput } from './remove-school-member-role.output.js';

export class RemoveSchoolMemberRoleUseCase {
  constructor(
    private readonly memberships: SchoolMembershipRepository,
    private readonly roles: SchoolRoleRepository,
    private readonly authorization: SchoolAuthorizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(
    input: RemoveSchoolMemberRoleInput,
  ): Promise<RemoveSchoolMemberRoleOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.memberUserId?.trim()) {
      throw new InvalidSchoolMembershipException('Member user ID is required');
    }
    if (!input.roleId?.trim()) {
      throw new InvalidSchoolMembershipException('Role ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    const actor = { userId: input.performedBy };
    await this.authorization.assertCan(actor, SchoolAction.ASSIGN_ROLES, input.schoolId);
    const school = await this.authorization.assertSchoolWritable(input.schoolId);

    const role = await this.roles.findById(input.roleId);
    if (!role || role.schoolId !== input.schoolId) {
      throw new SchoolRoleNotFoundException(input.roleId);
    }
    if (role.isAdmin) {
      throw new SchoolMembershipActionForbiddenException(
        'The administrator role is only removed by replacing the administrator',
      );
    }

    const target = await this.memberships.findBySchoolAndUser(
      input.schoolId,
      input.memberUserId,
    );
    if (!target) {
      throw new SchoolMembershipNotFoundException(input.schoolId, input.memberUserId);
    }
    await this.authorization.assertCanManageTarget(actor, input.schoolId, target);

    const changed = target.removeRole(role.id); // refuses the last role
    const saved = changed ? await this.memberships.save(target) : target;

    if (changed) {
      this.eventEmitter.emit(
        'school.member-role.changed',
        new SchoolMemberRoleChangedEvent(
          input.schoolId,
          school.name,
          input.memberUserId,
          role.id,
          role.name,
          'REMOVED',
          input.performedBy,
        ),
      );
    }

    return { membership: toSchoolMembershipOutput(saved), changed };
  }
}
