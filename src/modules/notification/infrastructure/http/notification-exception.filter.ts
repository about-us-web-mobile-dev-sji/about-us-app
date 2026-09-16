import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
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
    const statusCode =
      error instanceof NotificationNotFoundException ||
      error instanceof RecipientNotFoundException
        ? 404
        : 400;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, message: error.message });
  }
}
