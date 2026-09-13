export class InvalidPasswordException extends Error {
  constructor(
    message = 'New password must contain at least 12 characters and at most 72 UTF-8 bytes',
  ) {
    super(message);
    this.name = 'InvalidPasswordException';
  }
}
