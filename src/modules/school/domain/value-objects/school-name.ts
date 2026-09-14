import { InvalidSchoolException } from '../exceptions/invalid-school.exception.js';

export class SchoolName {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(input: string): SchoolName {
    if (typeof input !== 'string') {
      throw new InvalidSchoolException('School name must be a string');
    }
    const value = input.trim();
    if (value.length === 0) {
      throw new InvalidSchoolException('School name cannot be empty');
    }
    if (value.length > 200) {
      throw new InvalidSchoolException('School name cannot exceed 200 characters');
    }
    return new SchoolName(value);
  }
}
