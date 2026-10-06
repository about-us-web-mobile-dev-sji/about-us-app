import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SignUpNotAllowedException extends DomainException {
  constructor() {
    super('No pending invitation for this account', 'SIGNUP_NOT_ALLOWED', 403);
  }
}
