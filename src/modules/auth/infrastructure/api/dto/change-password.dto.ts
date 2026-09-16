import { BadRequestException } from '@nestjs/common';

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
      throw new BadRequestException(
        'currentPassword and newPassword are required',
      );
    return new ChangePasswordDto(body.currentPassword, body.newPassword);
  }
}
