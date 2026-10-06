import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class UnpersistedUserException extends DomainException {
  constructor() {
    super('Repository returned an unpersisted user', 'UNPERSISTED_USER', 500);
  }
}
