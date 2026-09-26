import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class SchoolMembershipActionForbiddenException extends DomainException {
  constructor(
    message = 'Only an active administrator of this school can perform this action',
  ) {
    super(message, 'SCHOOL_MEMBERSHIP_ACTION_FORBIDDEN', 403);
  }
}
