export interface AuthSubjectGateway {
  authenticationProfile(
    id: string,
  ): Promise<{ id: string; email: string } | null>;
  create(input: {
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<string>;
  canAuthenticateWithGoogle(subjectId: string): Promise<boolean>;
  exists(subjectId: string): Promise<boolean>;
  canAuthenticate(subjectId: string): Promise<boolean>;
}

export const AUTH_SUBJECT = Symbol('AUTH_SUBJECT');
