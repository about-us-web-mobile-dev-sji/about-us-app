import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptSchoolInvitation } from './AcceptSchoolInvitation.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';

describe('AcceptSchoolInvitation', () => {
  const props = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'École test',
    address: null,
    city: null,
    postalCode: null,
    country: null,
    phoneNumber: null,
    email: 'admin@ecole.test',
    website: null,
    status: SchoolStatus.ACTIVE,
    adminUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'a-inviter-id',
  };

  const repository = (
    initial: School,
  ): { repo: SchoolRepository; stored: () => School } => {
    let stored = initial;
    return {
      repo: {
        findById: async (id) => (stored.id === id ? stored : null),
        findByName: async () => null,
        existsByName: async () => false,
        save: async (school) => {
          stored = school;
          return school;
        },
        findAll: async () => [stored],
      },
      stored: () => stored,
    };
  };

  const emitter = { emit: vi.fn() };
  beforeEach(() => {
    emitter.emit.mockClear();
  });

  it('assigns the admin and emits invitation.accepted to inform the inviter', async () => {
    const { repo, stored } = repository(School.reconstitute(props));
    const useCase = new AcceptSchoolInvitation(repo, emitter as any);

    const { school } = await useCase.handle({
      schoolId: props.id,
      adminUserId: '22222222-2222-4222-8222-222222222222',
    });

    expect(school.toPrimitives().adminUserId).toBe(
      '22222222-2222-4222-8222-222222222222',
    );
    expect(stored().toPrimitives().adminUserId).toBe(
      '22222222-2222-4222-8222-222222222222',
    );
    expect(emitter.emit).toHaveBeenCalledTimes(1);
    expect(emitter.emit).toHaveBeenCalledWith(
      'invitation.accepted',
      expect.objectContaining({
        inviterId: 'a-inviter-id',
        schoolId: props.id,
        schoolName: 'École test',
        adminUserId: '22222222-2222-4222-8222-222222222222',
      }),
    );
  });

  it('does nothing when the admin is already assigned', async () => {
    const { repo } = repository(
      School.reconstitute({
        ...props,
        adminUserId: '22222222-2222-4222-8222-222222222222',
      }),
    );
    const useCase = new AcceptSchoolInvitation(repo, emitter as any);

    const { school } = await useCase.handle({
      schoolId: props.id,
      adminUserId: '22222222-2222-4222-8222-222222222222',
    });

    expect(school.toPrimitives().adminUserId).toBe(
      '22222222-2222-4222-8222-222222222222',
    );
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('rejects acceptance when the school is blocked', async () => {
    const { repo } = repository(
      School.reconstitute({ ...props, status: SchoolStatus.BLOCKED }),
    );
    const useCase = new AcceptSchoolInvitation(repo, emitter as any);

    await expect(
      useCase.handle({
        schoolId: props.id,
        adminUserId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toBeInstanceOf(InvalidSchoolException);
  });

  it('throws when the school does not exist', async () => {
    const { repo } = repository(School.reconstitute(props));
    const useCase = new AcceptSchoolInvitation(repo, emitter as any);

    await expect(
      useCase.handle({
        schoolId: 'unknown-id',
        adminUserId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toBeInstanceOf(SchoolNotFoundException);
  });

  it('throws when adminUserId is missing', async () => {
    const { repo } = repository(School.reconstitute(props));
    const useCase = new AcceptSchoolInvitation(repo, emitter as any);

    await expect(
      useCase.handle({ schoolId: props.id, adminUserId: '' }),
    ).rejects.toBeInstanceOf(InvalidSchoolException);
  });
});