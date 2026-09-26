import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class AccountUnavailableException extends DomainException {
  constructor() {
    super('Account unavailable', 'ACCOUNT_UNAVAILABLE', 401);
  }
}
