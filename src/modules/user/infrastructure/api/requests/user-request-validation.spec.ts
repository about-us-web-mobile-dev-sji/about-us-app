import { describe, expect, it, vi } from 'vitest';
import { ListUsersRequest } from './list-users.request.js';
import { UpdateUserStatusRequest } from './update-user-status.request.js';
import UserStatus from '../../../domain/enum/user-status.enum.js';
import { InvalidUserException } from '../../../domain/exceptions/invalid-user.exception.js';
import { UserNotFoundException } from '../../../domain/exceptions/user-not-found.exception.js';
import { UpdateUserStatus } from '../../../application/use-cases/commands/update-user-status/update-user-status.js';
import type { UserRepository } from '../../../domain/repositories/i-user.repository.js';
import { UserExceptionFilter } from '../../config/user-exception.filter.js';
import type { ArgumentsHost } from '@nestjs/common';

const id = 'abcdef00-0000-4000-8000-000000000001';
describe('User API validation', () => {
  it('keeps pagination defaults and parses query strings', () => {
    expect(ListUsersRequest.toInput({}).pagination).toEqual({ page: 1, limit: 10 });
    expect(ListUsersRequest.toInput({ page: '2', limit: '5' }).pagination).toEqual({ page: 2, limit: 5 });
  });
  it.each(['abc', '0', '-1', '1.5', '', 'Infinity', '9007199254740992'])('rejects pagination %s', (value) => {
    for (const field of ['page', 'limit'])
      expect(() => ListUsersRequest.toInput({ [field]: value })).toThrow(InvalidUserException);
  });
  it('rejects invalid filter types', () => {
    expect(() => ListUsersRequest.toInput({ search: [] } as unknown as ListUsersRequest)).toThrow(InvalidUserException);
    expect(() => ListUsersRequest.toInput({ status: 'UNKNOWN' } as unknown as ListUsersRequest)).toThrow(InvalidUserException);
  });
  it.each([undefined, {}, { status: 'UNKNOWN' }])('rejects invalid status body %j', (body) => {
    expect(() => UpdateUserStatusRequest.toInput(id, body as UpdateUserStatusRequest)).toThrow(InvalidUserException);
  });
  it('validates and normalizes identifiers', () => {
    expect(() => UpdateUserStatusRequest.toInput('invalid', { status: UserStatus.ACTIVE })).toThrow(InvalidUserException);
    expect(UpdateUserStatusRequest.toInput(id.toUpperCase(), { status: UserStatus.ACTIVE }).userId).toBe(id);
  });
  it('rejects invalid status before accessing persistence, even without HTTP', async () => {
    const findById = vi.fn();
    const useCase = new UpdateUserStatus({ findById } as unknown as UserRepository);
    await expect(useCase.updateUserStatus({ userId: id, status: 'UNKNOWN' as UserStatus })).rejects.toBeInstanceOf(InvalidUserException);
    expect(findById).not.toHaveBeenCalled();
  });
  it('reports a missing user and maps it to HTTP 404', async () => {
    const useCase = new UpdateUserStatus({ findById: vi.fn().mockResolvedValue(null) } as unknown as UserRepository);
    await expect(useCase.updateUserStatus({ userId: id, status: UserStatus.ACTIVE })).rejects.toBeInstanceOf(UserNotFoundException);
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
    new UserExceptionFilter().catch(new UserNotFoundException(), host);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 404, message: 'User not found' });
  });
});
