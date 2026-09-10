export class UserEmailAlreadyUsedException extends Error {
  constructor(message = 'An account already uses this email') {
    super(message);
    this.name = 'UserEmailAlreadyUsedException';
  }
}
