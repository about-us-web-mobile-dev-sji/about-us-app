import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolRoleInUseException extends DomainException {
  constructor() {
    super(
      'This role is still assigned to members; remove it from them first',
      'SCHOOL_ROLE_IN_USE',
      409,
    );
  }
}
