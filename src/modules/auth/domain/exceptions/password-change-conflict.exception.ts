export class PasswordChangeConflictException extends Error {
  constructor(message = 'Password changed concurrently; authenticate again') {
    super(message);
    this.name = 'PasswordChangeConflictException';
  }
}
