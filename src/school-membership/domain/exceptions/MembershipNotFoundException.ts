import { DomainException } from '../../../shared/domain/exceptions/DomainException.js';

export class MembershipNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`Membership not found: ${identifier}`);
  }
}
