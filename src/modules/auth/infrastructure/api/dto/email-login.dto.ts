import { InvalidAuthRequestException } from '../../../domain/exceptions/invalid-auth-request.exception.js';

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
      throw new InvalidAuthRequestException(['email', 'password']);
    return new EmailLoginDto(body.email, body.password);
  }
}
