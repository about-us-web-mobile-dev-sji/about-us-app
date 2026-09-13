export class SchoolNotFoundException extends Error {
  constructor() {
    super('School not found');
    this.name = 'SchoolNotFoundException';
  }
}