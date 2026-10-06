export interface AuthenticationResult {
  user: { id: string; email: string };
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}
