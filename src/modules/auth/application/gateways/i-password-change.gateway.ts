export interface PasswordChangeGateway {
  /** Compare the old hash, replace it and revoke all user sessions atomically. */
  change(input: {
    identityId: string;
    subjectId: string;
    expectedHash: string;
    passwordHash: string;
  }): Promise<void>;
}
export const PASSWORD_CHANGE = Symbol('PASSWORD_CHANGE');
