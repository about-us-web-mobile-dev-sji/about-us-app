export class InvalidGoogleIdentityException extends Error {
  constructor() {
    super('Invalid Google identity');
    this.name = 'InvalidGoogleIdentityException';
  }
}
