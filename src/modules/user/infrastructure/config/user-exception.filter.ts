import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception.js';
import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvalidUserException } from '../../domain/exceptions/invalid-user.exception.js';
import { UserEmailAlreadyUsedException } from '../../domain/exceptions/user-email-already-used.exception.js';
@Catch(InvalidUserException, UserEmailAlreadyUsedException, UserNotFoundException)
export class UserExceptionFilter implements ExceptionFilter {
  catch(
    error: InvalidUserException | UserEmailAlreadyUsedException | UserNotFoundException,
    host: ArgumentsHost,
  ) {
    const statusCode = error instanceof UserNotFoundException ? 404 : error instanceof InvalidUserException ? 400 : 409;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, message: error.message });
  }
}
