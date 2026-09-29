import { randomUUID } from 'node:crypto';
import type { ReplaceSchoolAdministratorInput } from './replace-school-administrator.input.js';
import type { ReplaceSchoolAdministratorOutput } from './replace-school-administrator.output.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import { MembershipStatus } from '../../../../domain/enums/membership-status.enum.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import { InvalidReplacementException } from '../../../../domain/exceptions/invalid-replacement.exception.js';
import { SchoolAdministratorNotFoundException } from '../../../../domain/exceptions/school-administrator-not-found.exception.js';

export class ReplaceSchoolAdministratorUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly memberships: SchoolMembershipRepository,
    private readonly users: UserAccountService,
    private readonly roleChanged: (event: {
      eventId: string;
      schoolId: string;
      schoolName: string;
      recipientIds: string[];
      occurredAt: Date;
    }) => void = () => {},
  ) {}

  async handle(
    input: ReplaceSchoolAdministratorInput,
  ): Promise<ReplaceSchoolAdministratorOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidReplacementException('School ID is required');
    }
    if (!input.newAdminUserId?.trim()) {
      throw new InvalidReplacementException('New admin user ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidReplacementException('PerformedBy is required');
    }

    const school = await this.schools.findById(input.schoolId);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }

    const newAdminExists = await this.users.exists(input.newAdminUserId);
    if (!newAdminExists) {
      throw new SchoolAdministratorNotFoundException(input.newAdminUserId);
    }

    // The school's administrator is whoever holds a live SCHOOL_ADMIN
    // membership; the school itself stores no admin reference.
    const schoolMemberships = await this.memberships.findBySchool(
      input.schoolId,
    );
    const currentAdmins = schoolMemberships.filter(
      (m) =>
        m.role === MembershipRole.SCHOOL_ADMIN &&
        m.status !== MembershipStatus.REVOKED,
    );

    if (
      currentAdmins.some(
        (m) =>
          m.userId === input.newAdminUserId &&
          m.status === MembershipStatus.ACTIVE,
      )
    ) {
      throw new InvalidReplacementException(
        'New admin is already the school administrator',
      );
    }

    // Validate everything before touching anything, so a refusal can't leave
    // the school without an administrator.
    const existingMembership = schoolMemberships.find(
      (m) => m.userId === input.newAdminUserId,
    );
    if (existingMembership?.status === MembershipStatus.REVOKED) {
      throw new InvalidReplacementException(
        'Cannot appoint a user whose school membership has been revoked; grant them a new invitation first',
      );
    }

    const previousAdmins = currentAdmins.filter(
      (m) => m.userId !== input.newAdminUserId,
    );
    for (const previous of previousAdmins) {
      previous.revoke(input.performedBy);
      await this.memberships.save(previous);
    }
    const previousAdminUserId = previousAdmins[0]?.userId ?? null;

    if (existingMembership) {
      existingMembership.changeRole(MembershipRole.SCHOOL_ADMIN);
      existingMembership.activate();
      await this.memberships.save(existingMembership);
    } else {
      await this.memberships.save(
        SchoolMembership.create({
          schoolId: input.schoolId,
          userId: input.newAdminUserId,
          role: MembershipRole.SCHOOL_ADMIN,
          grantedBy: input.performedBy,
        }),
      );
    }

    this.roleChanged({
      eventId: randomUUID(),
      schoolId: input.schoolId,
      schoolName: school.toPrimitives().name,
      recipientIds: [previousAdminUserId, input.newAdminUserId].filter(
        (id): id is string => !!id,
      ),
      occurredAt: new Date(),
    });

    return {
      schoolId: input.schoolId,
      previousAdminUserId,
      newAdminUserId: input.newAdminUserId,
      membershipRevoked: previousAdmins.length > 0,
      newMembershipCreated: !existingMembership,
    };
  }
}
