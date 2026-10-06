/** Body returned to web clients: tokens travel only in HttpOnly cookies. */
export interface WebSessionResponseDto {
  user: { id: string; email: string };
  sessionId: string;
}
