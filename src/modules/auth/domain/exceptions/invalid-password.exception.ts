import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidPasswordException extends DomainException {
  constructor(
    message = 'New password must contain at least 12 characters and at most 72 UTF-8 bytes',
  ) {
    super(message, 'INVALID_PASSWORD', 400);
  }
}
