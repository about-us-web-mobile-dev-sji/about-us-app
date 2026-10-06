import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidRefreshTokenException extends DomainException {
  constructor() {
    super('Invalid, expired or already used refresh token', 'REFRESH_TOKEN_INVALID', 401);
  }
}
