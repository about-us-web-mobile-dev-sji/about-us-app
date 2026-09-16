import {
  TokenResponseDto,
  AuthenticatedSubjectDto,
} from '../dto/auth-response.dto.js';
export class AuthResponseMapper {
  static token(value: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    refreshToken?: string;
  }): TokenResponseDto {
    return new TokenResponseDto(
      value.accessToken,
      value.tokenType,
      value.expiresIn,
      value.refreshToken,
    );
  }
  static subject(value: {
    subjectId: string;
    sessionId: string;
  }): AuthenticatedSubjectDto {
    return new AuthenticatedSubjectDto(value.subjectId, value.sessionId);
  }
}
