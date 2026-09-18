import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SuperAdminEmailConflictException extends DomainException {
  constructor() {
    super(
      'The initial super admin email is already used by an ordinary account',
      'SUPER_ADMIN_EMAIL_CONFLICT',
      409,
    );
  }
}
