import { DomainException } from '../../../shared/domain/exceptions/DomainException.js';

export class InvitationAlreadyUsedException extends DomainException {
  constructor() {
    super('Invitation has already been used');
  }
}
