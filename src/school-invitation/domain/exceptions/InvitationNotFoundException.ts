import { DomainException } from '../../../shared/domain/exceptions/DomainException.js';

export class InvitationNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`Invitation not found: ${identifier}`);
  }
}
