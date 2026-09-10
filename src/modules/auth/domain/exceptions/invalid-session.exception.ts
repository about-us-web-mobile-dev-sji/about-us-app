export class InvalidSessionException extends Error {
  constructor() {
    super('Session unavailable');
    this.name = 'InvalidSessionException';
  }
}
