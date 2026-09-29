import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolAdministratorAlreadyAssignedException extends DomainException {
  constructor(
    message = 'This school already has an administrator; replace the administrator instead',
  ) {
    super(message, 'SCHOOL_ADMINISTRATOR_ALREADY_ASSIGNED', 409);
  }
}
