import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidSchoolRoleException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_SCHOOL_ROLE', 400);
  }
}
