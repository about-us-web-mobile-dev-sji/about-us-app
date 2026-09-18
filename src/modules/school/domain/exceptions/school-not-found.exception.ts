import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolNotFoundException extends DomainException {
  constructor(schoolId: string) {
    super(`School with ID ${schoolId} not found`, 'SCHOOL_NOT_FOUND', 404);
  }
}
