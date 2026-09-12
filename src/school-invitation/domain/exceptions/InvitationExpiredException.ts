import { DomainException } from '../../../shared/domain/exceptions/DomainException.js';

export class InvitationExpiredException extends DomainException {
  constructor() {
    super('Invitation has expired');
  }
}
