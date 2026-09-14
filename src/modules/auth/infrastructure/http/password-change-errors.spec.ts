import { describe, expect, it, vi } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import { AuthApplicationExceptionFilter } from './auth-application-exception.filter.js';
import { InvalidPasswordException } from '../../domain/exceptions/invalid-password.exception.js';
import { PasswordChangeForbiddenException } from '../../domain/exceptions/password-change-forbidden.exception.js';
import { PasswordChangeConflictException } from '../../domain/exceptions/password-change-conflict.exception.js';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception.js';
describe('Password change HTTP errors', () => {
  it.each([
    [new InvalidPasswordException(), 400],
    [new InvalidCredentialsException(), 401],
    [new PasswordChangeForbiddenException(), 403],
    [new PasswordChangeConflictException(), 409],
  ] as const)('maps %s to %i', (error, status) => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    new AuthApplicationExceptionFilter().catch(error, host);
    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: status, message: error.message }),
    );
  });
});
