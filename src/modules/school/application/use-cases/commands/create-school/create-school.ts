import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationSentEvent } from '../../../events/invitation-sent.event.js';
import type { CreateSchoolInput } from './create-school.input.js';
import type { CreateSchoolOutput } from './create-school.output.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SchoolInvitationRepository } from '../../../../domain/repositories/i-school-invitation.repository.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolInvitation } from '../../../../domain/entities/school-invitation.entity.js';
import { SchoolRoleKey } from '../../../../domain/enums/school-role-key.enum.js';
import { SchoolNameAlreadyExistsException } from '../../../../domain/exceptions/school-name-already-exists.exception.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { UnpersistedSchoolException } from '../../../../domain/exceptions/unpersisted-school.exception.js';
import type { SchoolRoleRepository } from '../../../../domain/repositories/i-school-role.repository.js';
import { ensureSystemRoles } from '../../../services/school-role-provisioning.js';

export class CreateSchoolUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly invitations: SchoolInvitationRepository,
    private readonly roles: SchoolRoleRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(input: CreateSchoolInput): Promise<CreateSchoolOutput> {
    if (!input.name?.trim()) {
      throw new InvalidSchoolException('School name is required');
    }

    if (!input.createdBy?.trim()) {
      throw new InvalidSchoolException('createdBy is required');
    }

    const existingSchool = await this.schools.findByName(input.name.trim());
    if (existingSchool) {
      throw new SchoolNameAlreadyExistsException();
    }

    const school = School.create({
      name: input.name,
      phoneNumber: input.phoneNumber,
      email: input.email,
      website: input.website,
      createdBy: input.createdBy,
    });

    const savedSchool = await this.schools.save(school);
    const primitives = savedSchool.toPrimitives();
    if (!primitives.id) throw new UnpersistedSchoolException();
    // Every school starts with its system roles.
    const systemRoles = await ensureSystemRoles(this.roles, primitives.id);

    if (primitives.email) {
      const { invitation, token } = SchoolInvitation.issue({
        schoolId: primitives.id,
        email: primitives.email,
        roleId: systemRoles[SchoolRoleKey.SCHOOL_ADMIN].id,
        invitedBy: primitives.createdBy,
      });
      await this.invitations.save(invitation);

      this.eventEmitter.emit(
        'invitation.sent',
        new InvitationSentEvent(
          primitives.email,
          primitives.id,
          primitives.name,
          new Date(),
          token,
        ),
      );
    }

    return {
      id: primitives.id as `${string}-${string}-${string}-${string}-${string}`,
      name: primitives.name,
      phoneNumber: primitives.phoneNumber,
      email: primitives.email,
      website: primitives.website,
      status: primitives.status,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
      createdBy: primitives.createdBy,
    };
  }
}