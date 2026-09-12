import { DomainException } from '../../../shared/domain/exceptions/DomainException.js';

export class UserNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}
