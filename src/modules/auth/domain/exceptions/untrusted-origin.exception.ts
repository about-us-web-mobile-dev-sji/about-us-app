import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class UntrustedOriginException extends DomainException {
  constructor() {
    super('Untrusted request origin', 'UNTRUSTED_ORIGIN', 403);
  }
}
