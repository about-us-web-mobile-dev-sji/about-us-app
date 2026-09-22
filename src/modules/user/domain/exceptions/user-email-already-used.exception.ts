import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class UserEmailAlreadyUsedException extends DomainException {
  constructor(message = 'An account already uses this email') {
    super(message, 'USER_EMAIL_ALREADY_USED', 409);
  }
}
