import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception.js';
import {
  Catch,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvalidSessionException } from '../../domain/exceptions/invalid-session.exception.js';
import { AccountUnavailableException } from '../../domain/exceptions/account-unavailable.exception.js';
import { InvalidGoogleIdentityException } from '../../domain/exceptions/invalid-google-identity.exception.js';

@Catch(
  InvalidCredentialsException,
  InvalidSessionException,
  AccountUnavailableException,
  InvalidGoogleIdentityException,
)
export class AuthApplicationExceptionFilter implements ExceptionFilter {
  catch(
    error:
      | InvalidCredentialsException
      | InvalidSessionException
      | AccountUnavailableException
      | InvalidGoogleIdentityException,
    host: ArgumentsHost,
  ): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.UNAUTHORIZED)
      .json({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: error.message,
        error: 'Unauthorized',
      });
  }
}
