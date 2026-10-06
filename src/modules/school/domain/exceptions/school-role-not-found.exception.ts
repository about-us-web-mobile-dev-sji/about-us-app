import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolRoleNotFoundException extends DomainException {
  constructor(roleId: string) {
    super(`School role ${roleId} not found`, 'SCHOOL_ROLE_NOT_FOUND', 404);
  }
}
