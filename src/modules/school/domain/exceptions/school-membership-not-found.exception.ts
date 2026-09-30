import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolMembershipNotFoundException extends DomainException {
  constructor(schoolId: string, userId: string) {
    super(
      `Membership for user ${userId} in school ${schoolId} not found`,
      'SCHOOL_MEMBERSHIP_NOT_FOUND',
      404,
    );
  }
}
