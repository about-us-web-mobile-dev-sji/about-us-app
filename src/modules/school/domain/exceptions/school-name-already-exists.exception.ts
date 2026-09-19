import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolNameAlreadyExistsException extends DomainException {
  constructor() {
    super('School name already exists', 'SCHOOL_NAME_ALREADY_EXISTS', 409);
  }
}
