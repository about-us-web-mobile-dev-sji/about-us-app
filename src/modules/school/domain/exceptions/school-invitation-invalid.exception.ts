import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolInvitationInvalidException extends DomainException {
  constructor(message = 'Invitation is invalid or has expired') {
    super(message, 'SCHOOL_INVITATION_INVALID', 400);
  }
}
