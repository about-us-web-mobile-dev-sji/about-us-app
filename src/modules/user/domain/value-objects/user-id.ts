import type { UUID } from 'node:crypto';
import { InvalidUserException } from '../exceptions/invalid-user.exception.js';
export class UserId {
  private constructor(readonly value: UUID) {
    Object.freeze(this);
  }
  static create(value: string): UserId {
    if (
      typeof value !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    )
      throw new InvalidUserException('Invalid user identifier');
    return new UserId(value.toLowerCase() as UUID);
  }
}
