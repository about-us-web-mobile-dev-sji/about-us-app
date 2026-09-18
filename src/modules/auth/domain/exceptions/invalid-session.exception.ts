import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidSessionException extends DomainException {
  constructor() {
    super('Session unavailable', 'INVALID_SESSION', 401);
  }
}
