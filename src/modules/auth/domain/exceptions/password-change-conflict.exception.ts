import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class PasswordChangeConflictException extends DomainException {
  constructor(message = 'Password changed concurrently; authenticate again') {
    super(message, 'PASSWORD_CHANGE_CONFLICT', 409);
  }
}
