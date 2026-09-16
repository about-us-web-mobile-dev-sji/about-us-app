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
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception.js';
import { InvalidReplacementException } from '../../domain/exceptions/invalid-replacement.exception.js';

@Catch(
  InvalidSchoolException,
  SchoolNameAlreadyExistsException,
  SchoolNotFoundException,
  UserNotFoundException,
  InvalidReplacementException,
)
export class SchoolExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | InvalidSchoolException
      | SchoolNameAlreadyExistsException
      | SchoolNotFoundException
      | UserNotFoundException
      | InvalidReplacementException,
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
    } else if (exception instanceof SchoolNotFoundException) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof UserNotFoundException) {
      status = HttpStatus.NOT_FOUND;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.name,
    });
  }
}
