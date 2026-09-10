import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidSchoolException } from '../../domain/exceptions/invalid-school.exception.js';
import { SchoolNameAlreadyExistsException } from '../../domain/exceptions/school-name-already-exists.exception.js';

@Catch(InvalidSchoolException, SchoolNameAlreadyExistsException)
export class SchoolExceptionFilter implements ExceptionFilter {
  catch(
    exception: InvalidSchoolException | SchoolNameAlreadyExistsException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.BAD_REQUEST;
    let message = exception.message;

    if (exception instanceof SchoolNameAlreadyExistsException) {
      status = HttpStatus.CONFLICT;
      message = 'School name already exists';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error:
        exception instanceof InvalidSchoolException
          ? 'Invalid School'
          : 'Conflict',
    });
  }
}
