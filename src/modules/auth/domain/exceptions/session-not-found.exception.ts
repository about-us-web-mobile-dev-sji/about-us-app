import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SessionNotFoundException extends DomainException {
  constructor() {
    super('Session not found', 'SESSION_NOT_FOUND', 404);
  }
}
