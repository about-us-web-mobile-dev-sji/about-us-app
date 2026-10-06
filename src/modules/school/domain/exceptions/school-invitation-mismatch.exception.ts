import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolInvitationMismatchException extends DomainException {
  constructor(
    message = 'This invitation was sent to a different email address',
  ) {
    super(message, 'SCHOOL_INVITATION_MISMATCH', 403);
  }
}
