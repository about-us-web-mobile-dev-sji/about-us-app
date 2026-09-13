import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidSchoolException } from '../../domain/exceptions/invalid-school.exception.js';
import { SchoolNameAlreadyExistsException } from '../../domain/exceptions/school-name-already-exists.exception.js';
import { SchoolNotFoundException } from '../../domain/exceptions/school-not-found.exception.js';

@Catch(InvalidSchoolException, SchoolNameAlreadyExistsException, SchoolNotFoundException)
export class SchoolExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | InvalidSchoolException
      | SchoolNameAlreadyExistsException
      | SchoolNotFoundException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.BAD_REQUEST;
    let message = exception.message;

    if (exception instanceof SchoolNotFoundException) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof SchoolNameAlreadyExistsException) {
      status = HttpStatus.CONFLICT;
      message = 'School name already exists';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error:
        exception instanceof InvalidSchoolException
          ? 'Invalid School'
          : exception instanceof SchoolNotFoundException
            ? 'Not Found'
            : 'Conflict',
    });
  }
}
