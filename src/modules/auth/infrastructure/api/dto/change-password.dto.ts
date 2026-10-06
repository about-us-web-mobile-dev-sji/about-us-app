import { InvalidAuthRequestException } from '../../../domain/exceptions/invalid-auth-request.exception.js';

export class ChangePasswordDto {
  private constructor(
    readonly currentPassword: string,
    readonly newPassword: string,
  ) {}

  static parse(body: unknown): ChangePasswordDto {
    if (
      !body ||
      typeof body !== 'object' ||
      !('currentPassword' in body) ||
      typeof body.currentPassword !== 'string' ||
      !body.currentPassword ||
      body.currentPassword.length > 1024 ||
      !('newPassword' in body) ||
      typeof body.newPassword !== 'string' ||
      !body.newPassword ||
      body.newPassword.length > 1024
    )
      throw new InvalidAuthRequestException([
        'currentPassword',
        'newPassword',
      ]);
    return new ChangePasswordDto(body.currentPassword, body.newPassword);
  }
}
