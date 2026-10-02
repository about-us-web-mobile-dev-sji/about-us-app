import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchoolMemberPermissionChangedEvent } from '../../../../infrastructure/events/school-member-permission-changed.event.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import { isGrantableAction } from '../../../../domain/policies/school-role-permissions.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { toSchoolMembershipOutput } from '../../school.output.js';
import type { RevokeSchoolMemberPermissionInput } from './revoke-school-member-permission.input.js';
import type { RevokeSchoolMemberPermissionOutput } from './revoke-school-member-permission.output.js';
import type { UUID } from 'node:crypto';

export class RevokeSchoolMemberPermissionUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly memberships: SchoolMembershipRepository,
    private readonly authorization: SchoolAuthorizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(
    input: RevokeSchoolMemberPermissionInput,
  ): Promise<RevokeSchoolMemberPermissionOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.memberUserId?.trim()) {
      throw new InvalidSchoolMembershipException('Member user ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    const actor = {
      userId: input.performedBy,
      globalRole: input.performedByGlobalRole,
    };
    await this.authorization.assertCan(
      actor,
      SchoolAction.MANAGE_MEMBER_PERMISSIONS,
      input.schoolId,
    );
    await this.authorization.assertSchoolWritable(actor, input.schoolId);

    if (!isGrantableAction(input.action)) {
      throw new InvalidSchoolMembershipException(
        `Action ${String(input.action)} cannot be delegated`,
      );
    }

    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }
    const target = await this.memberships.findBySchoolAndUser(
      input.schoolId,
      input.memberUserId,
    );
    if (!target) {
      throw new SchoolMembershipNotFoundException(
        input.schoolId,
        input.memberUserId,
      );
    }

    const changed = target.revokePermission(input.action);
    const saved = changed ? await this.memberships.save(target) : target;

    if (changed) {
      this.eventEmitter.emit(
        'school.member-permission.revoked',
        new SchoolMemberPermissionChangedEvent(
          input.schoolId,
          school.toPrimitives().name,
          input.memberUserId,
          input.action,
          'REVOKED',
          input.performedBy,
        ),
      );
    }

    return { membership: toSchoolMembershipOutput(saved), changed };
  }
}
