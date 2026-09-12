import { DomainException } from '../../../shared/domain/exceptions/DomainException.js';

export class InvitationAlreadyExistsException extends DomainException {
  constructor(email: string) {
    super(`A pending invitation already exists for email: ${email}`);
  }
}
