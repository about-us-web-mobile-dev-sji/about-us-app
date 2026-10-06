import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidEventLogException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_EVENT_LOG', 400);
  }
}