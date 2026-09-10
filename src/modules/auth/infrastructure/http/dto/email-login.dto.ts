import { BadRequestException } from '@nestjs/common';
export class EmailLoginDto {
  private constructor(
    readonly email: string,
    readonly password: string,
  ) {}
  static parse(body: unknown): EmailLoginDto {
    if (
      !body ||
      typeof body !== 'object' ||
      !('email' in body) ||
      typeof body.email !== 'string' ||
      !body.email.trim() ||
      body.email.length > 320 ||
      !('password' in body) ||
      typeof body.password !== 'string' ||
      !body.password ||
      body.password.length > 1024
    )
      throw new BadRequestException('email and password are required');
    return new EmailLoginDto(body.email, body.password);
  }
}
