import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationAcceptedEvent } from '../../../../../event/invitation-accepted.event.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { AcceptSchoolInvitationInput } from './AcceptSchoolInvitationInput.js';
import type { AcceptSchoolInvitationOutput } from './AcceptSchoolInvitationOutput.js';

export class AcceptSchoolInvitation {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(
    input: AcceptSchoolInvitationInput,
  ): Promise<AcceptSchoolInvitationOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolException('School id is required');
    }

    if (!input.adminUserId?.trim()) {
      throw new InvalidSchoolException('adminUserId is required');
    }

    const school = await this.schools.findById(input.schoolId);
    if (!school) {
      throw new SchoolNotFoundException();
    }

    if (school.status === SchoolStatus.BLOCKED) {
      throw new InvalidSchoolException(
        'School is blocked, invitation cannot be accepted',
      );
    }

    const primitives = school.toPrimitives();
    if (primitives.adminUserId === input.adminUserId) {
      return { school };
    }

    school.assignAdmin(input.adminUserId);
    const saved = await this.schools.save(school);
    const savedPrimitives = saved.toPrimitives();

    this.eventEmitter.emit(
      'invitation.accepted',
      new InvitationAcceptedEvent(
        savedPrimitives.createdBy,
        savedPrimitives.id,
        savedPrimitives.name,
        savedPrimitives.adminUserId as string,
        new Date(),
      ),
    );

    return { school: saved };
  }
}