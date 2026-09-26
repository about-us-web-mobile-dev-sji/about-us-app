import { describe, expect, it, vi } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import { CreateSchoolUseCase } from './CreateSchool.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import { SchoolNameAlreadyExistsException } from '../../../../domain/exceptions/school-name-already-exists.exception.js';
import { GlobalExceptionFilter } from '../../../../../../shared/infrastructure/http/global-exception.filter.js';

const input = { name: 'Existing school', createdBy: 'user-id' };

const createHost = () => {
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { response, host };
};

describe('CreateSchool error handling', () => {
  it('returns the expected conflict error through the shared contract', async () => {
    const useCase = new CreateSchoolUseCase(
      { findByName: vi.fn().mockResolvedValue({}) } as unknown as SchoolRepository,
      { emit: vi.fn() } as never,
    );

    await expect(useCase.handle(input)).rejects.toBeInstanceOf(
      SchoolNameAlreadyExistsException,
    );

    const { response, host } = createHost();
    new GlobalExceptionFilter().catch(new SchoolNameAlreadyExistsException(), host);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      code: 'SCHOOL_NAME_ALREADY_EXISTS',
      message: 'School name already exists',
      details: null,
    });
  });

  it('hides an unexpected creation failure', async () => {
    const useCase = new CreateSchoolUseCase(
      {
        findByName: vi.fn().mockRejectedValue(new Error('database password=secret')),
      } as unknown as SchoolRepository,
      { emit: vi.fn() } as never,
    );

    await expect(useCase.handle(input)).rejects.toThrow('database password=secret');

    const { response, host } = createHost();
    new GlobalExceptionFilter().catch(
      new Error('database password=secret'),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Une erreur interne est survenue',
      details: null,
    });
  });
});