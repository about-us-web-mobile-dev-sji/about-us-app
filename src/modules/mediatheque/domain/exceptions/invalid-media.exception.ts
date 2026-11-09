export class InvalidMediaException extends Error {
  constructor(message = 'Invalid media') {
    super(message);
    this.name = 'InvalidMediaException';
  }
}
