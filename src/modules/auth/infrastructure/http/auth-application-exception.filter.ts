import { InvalidPasswordException } from '../../domain/exceptions/invalid-password.exception.js';
import { PasswordChangeForbiddenException } from '../../domain/exceptions/password-change-forbidden.exception.js';
import { PasswordChangeConflictException } from '../../domain/exceptions/password-change-conflict.exception.js';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception.js';
import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvalidSessionException } from '../../domain/exceptions/invalid-session.exception.js';
import { AccountUnavailableException } from '../../domain/exceptions/account-unavailable.exception.js';
import { InvalidGoogleIdentityException } from '../../domain/exceptions/invalid-google-identity.exception.js';

@Catch(
  InvalidPasswordException,
  PasswordChangeForbiddenException,
  PasswordChangeConflictException,
  InvalidCredentialsException,
  InvalidSessionException,
  AccountUnavailableException,
  InvalidGoogleIdentityException,
)
export class AuthApplicationExceptionFilter implements ExceptionFilter {
  catch(
    error:
      | InvalidPasswordException
      | PasswordChangeForbiddenException
      | PasswordChangeConflictException
      | InvalidCredentialsException
      | InvalidSessionException
      | AccountUnavailableException
      | InvalidGoogleIdentityException,
    host: ArgumentsHost,
  ): void {
    const status =
      error instanceof InvalidPasswordException
        ? 400
        : error instanceof PasswordChangeForbiddenException
          ? 403
          : error instanceof PasswordChangeConflictException
            ? 409
            : 401;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({
        statusCode: status,
        message: error.message,
        error:
          status === 400
            ? 'Bad Request'
            : status === 403
              ? 'Forbidden'
              : status === 409
                ? 'Conflict'
                : 'Unauthorized',
      });
  }
}
