import { randomUUID } from 'node:crypto';
import type { ReplaceSchoolAdministratorInput } from './ReplaceSchoolAdministratorInput.js';
import type { ReplaceSchoolAdministratorOutput } from './ReplaceSchoolAdministratorOutput.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SchoolMembershipRepository } from '../../../../domain/repositories/i-school-membership.repository.js';
import type { UserAccountService } from '../../../../../user/application/user-account.service.js';
import { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
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

    const previousAdminUserId = school.adminUserId;

    if (previousAdminUserId === input.newAdminUserId) {
      throw new InvalidReplacementException(
        'New admin is already the school administrator',
      );
    }

    let membershipRevoked = false;

    if (previousAdminUserId) {
      const previousMembership = await this.memberships.findBySchoolAndUser(
        input.schoolId,
        previousAdminUserId,
      );

      if (previousMembership) {
        previousMembership.revoke(input.performedBy);
        await this.memberships.save(previousMembership);
        membershipRevoked = true;
      }
    }

    let existingMembership = await this.memberships.findBySchoolAndUser(
      input.schoolId,
      input.newAdminUserId,
    );

    if (existingMembership) {
      existingMembership.changeRole(MembershipRole.SCHOOL_ADMIN);
      existingMembership.deactivate();
      existingMembership = SchoolMembership.reconstitute({
        ...existingMembership.toPrimitives(),
        status: 'ACTIVE' as any,
      });
      await this.memberships.save(existingMembership);
    } else {
      const newMembership = SchoolMembership.create({
        schoolId: input.schoolId,
        userId: input.newAdminUserId,
        role: MembershipRole.SCHOOL_ADMIN,
        grantedBy: input.performedBy,
      });
      await this.memberships.save(newMembership);
    }

    school.assignAdmin(input.newAdminUserId);
    await this.schools.save(school);

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
      membershipRevoked,
      newMembershipCreated: !existingMembership,
    };
  }
}
