import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidGoogleIdentityException extends DomainException {
  constructor() {
    super('Invalid Google identity', 'INVALID_GOOGLE_IDENTITY', 401);
  }
}
