import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidReplacementException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_REPLACEMENT', 400);
  }
}
