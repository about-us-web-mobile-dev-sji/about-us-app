import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidAccessTokenException extends DomainException {
  constructor() {
    super('Invalid or expired access token', 'ACCESS_TOKEN_INVALID', 401);
  }
}
