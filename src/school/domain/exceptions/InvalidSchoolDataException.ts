import { DomainException } from '../../../shared/domain/exceptions/DomainException.js';

export class InvalidSchoolDataException extends DomainException {
  constructor(message: string) {
    super(`Invalid school data: ${message}`);
  }
}
