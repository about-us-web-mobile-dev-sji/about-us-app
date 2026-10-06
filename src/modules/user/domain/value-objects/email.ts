import { InvalidUserException } from '../exceptions/invalid-user.exception.js';
export class Email {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }
  static create(input: string): Email {
    if (typeof input !== 'string')
      throw new InvalidUserException('Invalid email');
    const value = input.trim().toLowerCase();
    if (value.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      throw new InvalidUserException('Invalid email');
    return new Email(value);
  }
}
