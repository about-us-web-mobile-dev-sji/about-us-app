export class InvalidReplacementException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidReplacementException';
  }
}
