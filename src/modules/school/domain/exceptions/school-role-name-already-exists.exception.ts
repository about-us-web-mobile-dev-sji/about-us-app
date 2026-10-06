import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolRoleNameAlreadyExistsException extends DomainException {
  constructor() {
    super(
      'A role with this name already exists in this school',
      'SCHOOL_ROLE_NAME_ALREADY_EXISTS',
      409,
    );
  }
}
