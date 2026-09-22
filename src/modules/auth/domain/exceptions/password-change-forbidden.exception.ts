import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class PasswordChangeForbiddenException extends DomainException {
  constructor(
    message = 'Only the super administrator can change their password',
  ) {
    super(message, 'PASSWORD_CHANGE_FORBIDDEN', 403);
  }
}
