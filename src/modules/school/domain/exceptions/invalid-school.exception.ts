import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidSchoolException extends DomainException {
  constructor(message: string = 'Invalid school data') {
    super(message, 'INVALID_SCHOOL', 400);
  }
}
