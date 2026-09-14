export class SchoolNotFoundException extends Error {
  constructor(schoolId: string) {
    super(`School with ID ${schoolId} not found`);
    this.name = 'SchoolNotFoundException';
  }
}
