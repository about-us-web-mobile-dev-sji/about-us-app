export class AccountUnavailableException extends Error {
  constructor() {
    super('Account unavailable');
    this.name = 'AccountUnavailableException';
  }
}
