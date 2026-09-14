export class SchoolNameAlreadyExistsException extends Error {
  constructor() {
    super('School name already exists');
    this.name = 'SchoolNameAlreadyExistsException';
  }
}
