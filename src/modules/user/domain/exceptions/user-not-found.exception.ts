import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class UserNotFoundException extends DomainException {
  constructor(userId?: string) {
    super(
      userId ? `User with ID ${userId} not found` : 'User not found',
      'USER_NOT_FOUND',
      404,
    );
  }
}
