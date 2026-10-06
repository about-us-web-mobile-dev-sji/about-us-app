import type { AuthenticationResult } from '../../../application/models/authentication-result.js';
import type { WebSessionResponseDto } from '../dto/auth-response.dto.js';

export function toWebSessionResponse(
  result: AuthenticationResult,
): WebSessionResponseDto {
  return { user: result.user, sessionId: result.sessionId };
}
