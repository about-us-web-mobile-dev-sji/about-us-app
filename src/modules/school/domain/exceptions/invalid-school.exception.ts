export class InvalidSchoolException extends Error {
  constructor(message: string = 'Invalid school data') {
    super(message);
    this.name = 'InvalidSchoolException';
  }
}
