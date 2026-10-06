import { describe, expect, it, vi } from 'vitest';
import { ToggleSchoolStatus } from './toggle-school-status.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolStatus } from '../../../../domain/enums/school-status.enum.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SpaceRepository } from '../../../../../spaces/domain/repositories/i-space.repository.js';

describe('ToggleSchoolStatus', () => {
  const props = {
    id: '11111111-1111-4111-8111-111111111111' as const,
    name: 'École test',
    phoneNumber: null,
    email: 'contact@ecole.test',
    website: null,
    status: SchoolStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin',
  };

  const emptySpaces = {
    findSchoolTree: vi.fn(async () => []),
    save: vi.fn(async (space) => space),
  } as unknown as SpaceRepository;

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
        findByIds: async () => [],
        findAll: async () => [stored],
      },
      stored: () => stored,
    };
  };

  it('blocks an active school', async () => {
    const { repo, stored } = repository(School.reconstitute(props));
    const useCase = new ToggleSchoolStatus(repo, emptySpaces);

    const { school } = await useCase.handle({
      schoolId: props.id,
    });

    expect(school.status).toBe(SchoolStatus.BLOCKED);
    expect(stored().status).toBe(SchoolStatus.BLOCKED);
    expect(emptySpaces.findSchoolTree).toHaveBeenCalled();
  });

  it('unblocks a blocked school', async () => {
    const { repo, stored } = repository(
      School.reconstitute({ ...props, status: SchoolStatus.BLOCKED }),
    );
    const useCase = new ToggleSchoolStatus(repo, emptySpaces);

    const { school } = await useCase.handle({
      schoolId: props.id,
    });

    expect(school.status).toBe(SchoolStatus.ACTIVE);
    expect(stored().status).toBe(SchoolStatus.ACTIVE);
  });

  it('can explicitly block an already blocked school without enabling it', async () => {
    const { repo, stored } = repository(
      School.reconstitute({ ...props, status: SchoolStatus.BLOCKED }),
    );
    const useCase = new ToggleSchoolStatus(repo);

    const { school } = await useCase.handle({
      schoolId: props.id,
      status: SchoolStatus.BLOCKED,
    });

    expect(school.status).toBe(SchoolStatus.BLOCKED);
    expect(stored().status).toBe(SchoolStatus.BLOCKED);
  });

  it('throws when the school does not exist', async () => {
    const { repo } = repository(School.reconstitute(props));
    const useCase = new ToggleSchoolStatus(repo, emptySpaces);

    await expect(
      useCase.handle({ schoolId: 'unknown-id' }),
    ).rejects.toBeInstanceOf(SchoolNotFoundException);
  });
});
