import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class RefreshTokenRequiredException extends DomainException {
  constructor() {
    super('Refresh token is required', 'REFRESH_TOKEN_REQUIRED', 401);
  }
}
