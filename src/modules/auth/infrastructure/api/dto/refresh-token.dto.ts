import { BadRequestException } from '@nestjs/common';
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
      throw new BadRequestException('refreshToken is required');
    return new RefreshTokenDto(body.refreshToken);
  }
}
