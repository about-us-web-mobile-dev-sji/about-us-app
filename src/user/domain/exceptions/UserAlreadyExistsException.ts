import { DomainException } from '../../../shared/domain/exceptions/DomainException.js';

export class UserAlreadyExistsException extends DomainException {
  constructor(email: string) {
    super(`User already exists with email: ${email}`);
  }
}
