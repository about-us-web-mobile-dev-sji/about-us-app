import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidSchoolMembershipException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_SCHOOL_MEMBERSHIP', 400);
  }
}