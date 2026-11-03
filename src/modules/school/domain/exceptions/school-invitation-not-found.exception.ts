import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolInvitationNotFoundException extends DomainException {
  constructor(schoolId: string, invitationId: string) {
    super(
      `Invitation ${invitationId} in school ${schoolId} not found`,
      'SCHOOL_INVITATION_NOT_FOUND',
      404,
    );
  }
}
