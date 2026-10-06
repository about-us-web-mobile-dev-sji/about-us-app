import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { InvalidSchoolRoleException } from '../../../../domain/exceptions/invalid-school-role.exception.js';
import { SchoolRoleNameAlreadyExistsException } from '../../../../domain/exceptions/school-role-name-already-exists.exception.js';
import { SchoolRoleNotFoundException } from '../../../../domain/exceptions/school-role-not-found.exception.js';
import type { SchoolRoleRepository } from '../../../../domain/repositories/i-school-role.repository.js';
import { SchoolRoleChangedEvent } from '../../../events/school-role-changed.event.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { toSchoolRoleOutput } from '../../school.output.js';
import type { UpdateSchoolRoleInput } from './update-school-role.input.js';
import type { UpdateSchoolRoleOutput } from './update-school-role.output.js';

export class UpdateSchoolRoleUseCase {
  constructor(
    private readonly roles: SchoolRoleRepository,
    private readonly authorization: SchoolAuthorizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(input: UpdateSchoolRoleInput): Promise<UpdateSchoolRoleOutput> {
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

    // Anti-escalation only concerns the permissions being added.
    if (input.permissions) {
      const added = input.permissions.filter((p) => !role.hasPermission(p));
      await this.authorization.assertCanGrantPermissions(actor, input.schoolId, added);
    }
    if (
      input.name !== undefined &&
      (await this.roles.existsByName(input.schoolId, input.name, role.id))
    ) {
      throw new SchoolRoleNameAlreadyExistsException();
    }

    role.update({
      name: input.name,
      description: input.description,
      permissions: input.permissions,
    });
    const saved = await this.roles.save(role);

    this.eventEmitter.emit(
      'school.role.changed',
      new SchoolRoleChangedEvent(
        input.schoolId,
        school.name,
        saved.id,
        saved.name,
        'UPDATED',
        input.performedBy,
        saved.permissions,
      ),
    );

    return { role: toSchoolRoleOutput(saved) };
  }
}
