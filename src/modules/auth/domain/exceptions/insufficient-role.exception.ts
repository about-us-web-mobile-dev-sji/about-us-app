import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InsufficientRoleException extends DomainException {
  constructor() {
    super('Insufficient permissions', 'INSUFFICIENT_ROLE', 403);
  }
}
