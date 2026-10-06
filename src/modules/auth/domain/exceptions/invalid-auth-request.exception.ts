import { DomainException } from '../../../../shared/domain/exceptions/domain.exception.js';

export class InvalidAuthRequestException extends DomainException {
  constructor(fields: string[]) {
    super(`Invalid or missing fields: ${fields.join(', ')}`, 'INVALID_AUTH_REQUEST', 400, {
      fields,
    });
  }
}
