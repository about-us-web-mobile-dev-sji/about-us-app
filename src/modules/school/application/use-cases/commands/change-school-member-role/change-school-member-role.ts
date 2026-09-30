import { EventEmitter2 } from '@nestjs/event-emitter';
import { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';
import { SchoolMemberRoleChangedEvent } from '../../../../infrastructure/events/school-member-role-changed.event.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolAction } from '../../../../domain/enums/school-action.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolAdministratorAlreadyAssignedException } from '../../../../domain/exceptions/school-administrator-already-assigned.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import { SchoolMembershipNotFoundException } from '../../../../domain/exceptions/school-membership-not-found.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { toSchoolMembershipOutput } from '../../school.output.js';
import type { ChangeSchoolMemberRoleInput } from './change-school-member-role.input.js';
import type { ChangeSchoolMemberRoleOutput } from './change-school-member-role.output.js';
import type { UUID } from 'node:crypto';

export class ChangeSchoolMemberRoleUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly memberships: SchoolMembershipRepository,
    private readonly authorization: SchoolAuthorizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(
    input: ChangeSchoolMemberRoleInput,
  ): Promise<ChangeSchoolMemberRoleOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.memberUserId?.trim()) {
      throw new InvalidSchoolMembershipException('Member user ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }
    if (!Object.values(MembershipRole).includes(input.newRole)) {
      throw new InvalidSchoolMembershipException('A valid role is required');
    }

    const actor = {
      userId: input.performedBy,
      globalRole: input.performedByGlobalRole,
    };
    const isSuperAdmin = actor.globalRole === GlobalRole.SUPER_ADMIN;

    await this.authorization.assertCan(
      actor,
      SchoolAction.CHANGE_MEMBER_ROLE,
      input.schoolId,
    );
    if (input.memberUserId === input.performedBy) {
      throw new InvalidSchoolMembershipException(
        'You cannot change your own role',
      );
    }

    if (input.newRole === MembershipRole.SCHOOL_ADMIN) {
      await this.authorization.assertCan(
        actor,
        SchoolAction.INVITE_ADMIN,
        input.schoolId,
      );
    }
    await this.authorization.assertSchoolWritable(actor, input.schoolId);

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

    if (target.role === MembershipRole.SCHOOL_ADMIN && !isSuperAdmin) {
      throw new SchoolMembershipActionForbiddenException(
        "Only a super administrator can change the school administrator's role",
      );
    }

    if (input.newRole === MembershipRole.SCHOOL_ADMIN) {
      const schoolMemberships = await this.memberships.findBySchool(
        input.schoolId,
      );
      const otherAdmin = schoolMemberships.some(
        (m) =>
          m.userId !== input.memberUserId &&
          m.role === MembershipRole.SCHOOL_ADMIN &&
          m.status !== MembershipStatus.REVOKED,
      );
      if (otherAdmin) {
        throw new SchoolAdministratorAlreadyAssignedException();
      }
    }

    const previousRole = target.role;
    target.changeRole(input.newRole); // refuses revoked / identical role
    const saved = await this.memberships.save(target);

    this.eventEmitter.emit(
      'school.member-role.changed',
      new SchoolMemberRoleChangedEvent(
        input.schoolId,
        school.toPrimitives().name,
        input.memberUserId,
        previousRole,
        input.newRole,
        input.performedBy,
      ),
    );

    return { membership: toSchoolMembershipOutput(saved), previousRole };
  }
}
