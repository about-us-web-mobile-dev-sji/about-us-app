import { InvalidAuthRequestException } from '../../../domain/exceptions/invalid-auth-request.exception.js';

export class RefreshTokenDto {
  private constructor(readonly refreshToken: string) {}
  static parse(body: unknown): RefreshTokenDto {
    if (
      !body ||
      typeof body !== 'object' ||
      !('refreshToken' in body) ||
      typeof body.refreshToken !== 'string' ||
      !body.refreshToken ||
      body.refreshToken.length > 8192
    )
      throw new InvalidAuthRequestException(['refreshToken']);
    return new RefreshTokenDto(body.refreshToken);
  }
}
