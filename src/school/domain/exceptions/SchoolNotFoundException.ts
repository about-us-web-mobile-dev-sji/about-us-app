import { DomainException } from '../../../shared/domain/exceptions/DomainException.js';

export class SchoolNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`School not found: ${identifier}`);
  }
}
