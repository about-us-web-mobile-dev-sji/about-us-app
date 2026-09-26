import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationSentEvent } from '../../../../../event/invitation-sent.event.js';
import type { CreateSchoolInput } from './CreateSchoolInput.js';
import type { CreateSchoolOutput } from './CreateSchoolOutput.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolNameAlreadyExistsException } from '../../../../domain/exceptions/school-name-already-exists.exception.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { EnsureSchoolRootUseCase } from '../../../../../spaces/application/use-cases/commands/ensure-school-root/ensure-school-root.js';
import type { UUID } from 'node:crypto';

export class CreateSchoolUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly ensureSchoolRoot: EnsureSchoolRootUseCase,
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
      address: input.address,
      city: input.city,
      postalCode: input.postalCode,
      country: input.country,
      phoneNumber: input.phoneNumber,
      email: input.email,
      website: input.website,
      adminUserId: input.adminUserId,
      createdBy: input.createdBy,
    });

    const savedSchool = await this.schools.save(school);
    const primitives = savedSchool.toPrimitives();
    if (!primitives.id) throw new Error('Repository returned an unpersisted school');

    // Ensure school root space is created
    await this.ensureSchoolRoot.handle({
      schoolId: primitives.id as UUID,
      name: primitives.name,
    });

    if (primitives.email) {
      this.eventEmitter.emit(
        'invitation.sent',
        new InvitationSentEvent(
          primitives.email,
          primitives.id,
          primitives.name,
          new Date(),
        ),
      );
    }

    return {
      id: primitives.id as `${string}-${string}-${string}-${string}-${string}`,
      name: primitives.name,
      address: primitives.address,
      city: primitives.city,
      postalCode: primitives.postalCode,
      country: primitives.country,
      phoneNumber: primitives.phoneNumber,
      email: primitives.email,
      website: primitives.website,
      status: primitives.status,
      adminUserId: primitives.adminUserId,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
      createdBy: primitives.createdBy,
    };
  }
}