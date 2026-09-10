export class UnpersistedUserException extends Error {
  constructor() {
    super('Repository returned an unpersisted user');
    this.name = 'UnpersistedUserException';
  }
}
