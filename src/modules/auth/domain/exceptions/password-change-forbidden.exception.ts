export class PasswordChangeForbiddenException extends Error {
  constructor(
    message = 'Only the super administrator can change their password',
  ) {
    super(message);
    this.name = 'PasswordChangeForbiddenException';
  }
}
