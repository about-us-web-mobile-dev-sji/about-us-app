import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class AccessTokenRequiredException extends DomainException {
  constructor() {
    super('Access token is required', 'ACCESS_TOKEN_REQUIRED', 401);
  }
}
