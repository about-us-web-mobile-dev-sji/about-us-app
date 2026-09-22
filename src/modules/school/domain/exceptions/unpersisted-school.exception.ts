import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class UnpersistedSchoolException extends DomainException {
  constructor() {
    super('Repository returned an unpersisted school', 'UNPERSISTED_SCHOOL', 500);
  }
}