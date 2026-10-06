import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ErrorResponse } from '../../../../shared/infrastructure/http/error-response.js';
import { InvalidNotificationException } from '../../domain/exceptions/invalid-notification.exception.js';
import { NotificationNotFoundException } from '../../domain/exceptions/notification-not-found.exception.js';
import { RecipientNotFoundException } from '../../domain/exceptions/recipient-not-found.exception.js';

@Catch(
  InvalidNotificationException,
  NotificationNotFoundException,
  RecipientNotFoundException,
)
export class NotificationExceptionFilter implements ExceptionFilter {
  catch(
    error:
      | InvalidNotificationException
      | NotificationNotFoundException
      | RecipientNotFoundException,
    host: ArgumentsHost,
  ) {
    const [statusCode, code] =
      error instanceof NotificationNotFoundException
        ? [404, 'NOTIFICATION_NOT_FOUND']
        : error instanceof RecipientNotFoundException
          ? [404, 'NOTIFICATION_RECIPIENT_NOT_FOUND']
          : [400, 'INVALID_NOTIFICATION'];
    const body: ErrorResponse = { code, message: error.message, details: null };
    host.switchToHttp().getResponse<Response>().status(statusCode).json(body);
  }
}
