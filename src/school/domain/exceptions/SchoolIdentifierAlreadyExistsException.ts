import { DomainException } from '../../../shared/domain/exceptions/DomainException.js';

export class SchoolIdentifierAlreadyExistsException extends DomainException {
  constructor(identifier: string) {
    super(`School identifier already exists: ${identifier}`);
  }
}
