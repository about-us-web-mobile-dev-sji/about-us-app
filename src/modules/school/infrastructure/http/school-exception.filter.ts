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
<<<<<<< HEAD
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception.js';
import { InvalidReplacementException } from '../../domain/exceptions/invalid-replacement.exception.js';

@Catch(
  InvalidSchoolException,
  SchoolNameAlreadyExistsException,
  SchoolNotFoundException,
  UserNotFoundException,
  InvalidReplacementException,
)
=======

@Catch(InvalidSchoolException, SchoolNameAlreadyExistsException, SchoolNotFoundException)
>>>>>>> bf2f89ad25a959748ed2b806f2f111311ee8bd5a
export class SchoolExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | InvalidSchoolException
      | SchoolNameAlreadyExistsException
<<<<<<< HEAD
      | SchoolNotFoundException
      | UserNotFoundException
      | InvalidReplacementException,
=======
      | SchoolNotFoundException,
>>>>>>> bf2f89ad25a959748ed2b806f2f111311ee8bd5a
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
<<<<<<< HEAD
      error: exception.name,
=======
      error:
        exception instanceof InvalidSchoolException
          ? 'Invalid School'
          : exception instanceof SchoolNotFoundException
            ? 'Not Found'
            : 'Conflict',
>>>>>>> bf2f89ad25a959748ed2b806f2f111311ee8bd5a
    });
  }
}
