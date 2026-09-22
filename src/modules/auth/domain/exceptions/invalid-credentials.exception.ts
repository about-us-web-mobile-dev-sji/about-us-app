import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }
}
