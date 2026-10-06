import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchoolRole } from '../../../../domain/entities/school-role.entity.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { InvalidSchoolRoleException } from '../../../../domain/exceptions/invalid-school-role.exception.js';
import { SchoolRoleNameAlreadyExistsException } from '../../../../domain/exceptions/school-role-name-already-exists.exception.js';
import type { SchoolRoleRepository } from '../../../../domain/repositories/i-school-role.repository.js';
import { SchoolRoleChangedEvent } from '../../../events/school-role-changed.event.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { toSchoolRoleOutput } from '../../school.output.js';
import type { CreateSchoolRoleInput } from './create-school-role.input.js';
import type { CreateSchoolRoleOutput } from './create-school-role.output.js';

export class CreateSchoolRoleUseCase {
  constructor(
    private readonly roles: SchoolRoleRepository,
    private readonly authorization: SchoolAuthorizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(input: CreateSchoolRoleInput): Promise<CreateSchoolRoleOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolRoleException('School ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolRoleException('PerformedBy is required');
    }

    const actor = { userId: input.performedBy };
    await this.authorization.assertCan(actor, SchoolAction.MANAGE_ROLES, input.schoolId);
    const school = await this.authorization.assertSchoolWritable(input.schoolId);

    const role = SchoolRole.createCustom({
      schoolId: input.schoolId,
      name: input.name,
      description: input.description,
      permissions: input.permissions ?? [],
    });
    await this.authorization.assertCanGrantPermissions(
      actor,
      input.schoolId,
      role.permissions,
    );
    if (await this.roles.existsByName(input.schoolId, role.name)) {
      throw new SchoolRoleNameAlreadyExistsException();
    }

    const saved = await this.roles.save(role);

    this.eventEmitter.emit(
      'school.role.changed',
      new SchoolRoleChangedEvent(
        input.schoolId,
        school.name,
        saved.id,
        saved.name,
        'CREATED',
        input.performedBy,
        saved.permissions,
      ),
    );

    return { role: toSchoolRoleOutput(saved) };
  }
}
