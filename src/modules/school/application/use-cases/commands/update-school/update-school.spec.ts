import type { UUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { InvalidSchoolException } from '../../../../domain/exceptions/invalid-school.exception.js';
import { SchoolNameAlreadyExistsException } from '../../../../domain/exceptions/school-name-already-exists.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import { UpdateSchoolUseCase } from './update-school.js';

const schoolId = '11111111-1111-4111-8111-111111111111';
const otherSchoolId = '22222222-2222-4222-8222-222222222222';

const makeSchool = (id: string, name: string) =>
  School.reconstitute({
    id: id as UUID,
    name,
    phoneNumber: null,
    email: null,
    website: null,
    status: SchoolStatus.ACTIVE,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    createdBy: 'super-admin',
  });

const setup = () => {
  let stored = [makeSchool(schoolId, 'École test'), makeSchool(otherSchoolId, 'Autre école')];
  const repository: SchoolRepository = {
    findById: async (id) => stored.find((school) => school.id === id) ?? null,
    findByName: async (name) => stored.find((school) => school.name === name.trim()) ?? null,
    existsByName: async (name) => stored.some((school) => school.name === name.trim()),
    save: async (school) => {
      stored = stored.map((item) => item.id === school.id ? school : item);
      return school;
    },
    findAll: async () => stored,
    findByIds: async (ids) => stored.filter((school) => school.id && ids.includes(school.id)),
  };
  return { useCase: new UpdateSchoolUseCase(repository), stored: () => stored };
};

describe('UpdateSchoolUseCase', () => {
  it('updates and trims the supplied fields while retaining omitted fields', async () => {
    const { useCase, stored } = setup();
    const { school } = await useCase.handle({
      schoolId,
      name: '  Nouvelle école  ',
      email: ' contact@ecole.test ',
      website: 'https://ecole.test',
    });

    expect(school).toMatchObject({
      id: schoolId,
      name: 'Nouvelle école',
      phoneNumber: null,
      email: 'contact@ecole.test',
      website: 'https://ecole.test',
    });
    expect(stored()[0].name).toBe('Nouvelle école');
  });

  it('allows nullable contact fields to be cleared', async () => {
    const { useCase } = setup();
    await useCase.handle({ schoolId, phoneNumber: '  +33123456789  ' });
    const { school } = await useCase.handle({ schoolId, phoneNumber: null });
    expect(school.phoneNumber).toBeNull();
  });

  it('rejects a name already used by another school', async () => {
    const { useCase } = setup();
    await expect(useCase.handle({ schoolId, name: 'Autre école' })).rejects.toBeInstanceOf(
      SchoolNameAlreadyExistsException,
    );
  });

  it('requires at least one field and rejects a blank name', async () => {
    const { useCase } = setup();
    await expect(useCase.handle({ schoolId })).rejects.toBeInstanceOf(InvalidSchoolException);
    await expect(useCase.handle({ schoolId, name: '  ' })).rejects.toBeInstanceOf(InvalidSchoolException);
  });

  it('throws when the school does not exist', async () => {
    const { useCase } = setup();
    await expect(useCase.handle({ schoolId: '33333333-3333-4333-8333-333333333333', name: 'New' }))
      .rejects.toBeInstanceOf(SchoolNotFoundException);
  });
});
