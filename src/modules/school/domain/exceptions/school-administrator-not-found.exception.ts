import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolAdministratorNotFoundException extends DomainException {
  constructor(userId: string) {
    super(
      `School administrator with ID ${userId} not found`,
      'SCHOOL_ADMINISTRATOR_NOT_FOUND',
      404,
    );
  }
}