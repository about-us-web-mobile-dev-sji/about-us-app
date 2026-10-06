import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidUserException extends DomainException {
  constructor(message = 'Invalid user') {
    super(message, 'INVALID_USER', 400);
  }
}
