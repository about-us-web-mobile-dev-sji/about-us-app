import { EventEmitter2 } from '@nestjs/event-emitter';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { InvalidSchoolRoleException } from '../../../../domain/exceptions/invalid-school-role.exception.js';
import { SchoolRoleInUseException } from '../../../../domain/exceptions/school-role-in-use.exception.js';
import { SchoolRoleNotFoundException } from '../../../../domain/exceptions/school-role-not-found.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRoleRepository } from '../../../../domain/repositories/i-school-role.repository.js';
import { SchoolRoleChangedEvent } from '../../../events/school-role-changed.event.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import type { DeleteSchoolRoleInput } from './delete-school-role.input.js';
import type { DeleteSchoolRoleOutput } from './delete-school-role.output.js';

export class DeleteSchoolRoleUseCase {
  constructor(
    private readonly roles: SchoolRoleRepository,
    private readonly memberships: SchoolMembershipRepository,
    private readonly authorization: SchoolAuthorizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(input: DeleteSchoolRoleInput): Promise<DeleteSchoolRoleOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolRoleException('School ID is required');
    }
    if (!input.roleId?.trim()) {
      throw new InvalidSchoolRoleException('Role ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolRoleException('PerformedBy is required');
    }

    const actor = { userId: input.performedBy };
    await this.authorization.assertCan(actor, SchoolAction.MANAGE_ROLES, input.schoolId);
    const school = await this.authorization.assertSchoolWritable(input.schoolId);

    const role = await this.roles.findById(input.roleId);
    if (!role || role.schoolId !== input.schoolId) {
      throw new SchoolRoleNotFoundException(input.roleId);
    }
    role.assertDeletable();

    const holders = await this.memberships.findByRole(role.id);
    if (holders.some((m) => m.status !== MembershipStatus.REVOKED)) {
      throw new SchoolRoleInUseException();
    }

    await this.roles.delete(role.id);

    this.eventEmitter.emit(
      'school.role.changed',
      new SchoolRoleChangedEvent(
        input.schoolId,
        school.name,
        role.id,
        role.name,
        'DELETED',
        input.performedBy,
        role.permissions,
      ),
    );

    return { roleId: role.id };
  }
}
