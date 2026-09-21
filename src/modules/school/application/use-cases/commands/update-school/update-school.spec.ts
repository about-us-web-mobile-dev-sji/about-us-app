import { describe, expect, it } from 'vitest';
import { UpdateSchoolUseCase } from './UpdateSchool.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import { SchoolNameAlreadyExistsException } from '../../../../domain/exceptions/school-name-already-exists.exception.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';

describe('UpdateSchoolUseCase', () => {
  const props = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'École test',
    address: null,
    city: null,
    postalCode: null,
    country: null,
    phoneNumber: null,
    email: 'contact@ecole.test',
    website: null,
    status: SchoolStatus.ACTIVE,
    adminUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin',
  };

  const repository = (
    initial: School,
    nameExists = false,
  ): { repo: SchoolRepository; stored: () => School } => {
    let stored = initial;
    return {
      repo: {
        findById: async (id) => (stored.id === id ? stored : null),
        findByName: async () => null,
        existsByName: async () => nameExists,
        save: async (school) => {
          stored = school;
          return school;
        },
        findAll: async () => [stored],
      },
      stored: () => stored,
    };
  };

  it('updates the school fields', async () => {
    const { repo, stored } = repository(School.reconstitute(props));
    const useCase = new UpdateSchoolUseCase(repo);

    const { school } = await useCase.handle({
      schoolId: props.id,
      name: 'École modifiée',
      city: 'Yaoundé',
      country: 'Cameroun',
    });

    const primitives = school.toPrimitives();
    expect(primitives.name).toBe('École modifiée');
    expect(primitives.city).toBe('Yaoundé');
    expect(primitives.country).toBe('Cameroun');
    expect(stored().name).toBe('École modifiée');
  });

  it('throws when the school does not exist', async () => {
    const { repo } = repository(School.reconstitute(props));
    const useCase = new UpdateSchoolUseCase(repo);

    await expect(
      useCase.handle({ schoolId: 'unknown-id', name: 'Nouveau nom' }),
    ).rejects.toBeInstanceOf(SchoolNotFoundException);
  });

  it('throws when the new name is already used', async () => {
    const { repo } = repository(School.reconstitute(props), true);
    const useCase = new UpdateSchoolUseCase(repo);

    await expect(
      useCase.handle({ schoolId: props.id, name: 'Nom déjà pris' }),
    ).rejects.toBeInstanceOf(SchoolNameAlreadyExistsException);
  });
});