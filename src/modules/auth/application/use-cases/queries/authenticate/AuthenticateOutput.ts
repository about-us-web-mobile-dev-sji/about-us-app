export interface AuthenticateOutput {
  user: { id: string; email: string };
  subjectId: string;
  sessionId: string;
}
