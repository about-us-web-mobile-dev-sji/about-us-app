import { describe, expect, it, vi } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter.js';
import { DomainException } from '../../domain/exceptions/domain.exception.js';

const createHost = () => {
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { response, host };
};

describe('GlobalExceptionFilter', () => {
  it('normalizes domain exceptions', () => {
    const { response, host } = createHost();

    new GlobalExceptionFilter().catch(
      new DomainException('School name already exists', 'SCHOOL_NAME_ALREADY_EXISTS', 409),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      code: 'SCHOOL_NAME_ALREADY_EXISTS',
      message: 'School name already exists',
      details: null,
    });
  });

  it('hides unexpected errors from the client', () => {
    const { response, host } = createHost();

    new GlobalExceptionFilter().catch(
      new Error('database password=secret-token and SQL details'),
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