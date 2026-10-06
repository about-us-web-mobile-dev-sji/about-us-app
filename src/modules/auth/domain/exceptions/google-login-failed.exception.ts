import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

/** Google sign-in was cancelled or its OAuth exchange failed. */
export class GoogleLoginFailedException extends DomainException {
  constructor() {
    super('Google sign-in failed or was cancelled', 'GOOGLE_LOGIN_FAILED', 401);
  }
}
