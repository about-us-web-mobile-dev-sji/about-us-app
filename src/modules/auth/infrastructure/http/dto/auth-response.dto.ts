export class TokenResponseDto {
  constructor(
    readonly accessToken: string,
    readonly tokenType: string,
    readonly expiresIn: number,
    readonly refreshToken?: string,
  ) {}
}
export class AuthenticatedSubjectDto {
  constructor(
    readonly subjectId: string,
    readonly sessionId: string,
  ) {}
}
