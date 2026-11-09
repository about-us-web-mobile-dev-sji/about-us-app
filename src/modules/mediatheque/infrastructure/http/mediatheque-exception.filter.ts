import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ErrorResponse } from '../../../../shared/infrastructure/http/error-response.js';
import { InvalidMediaException } from '../../domain/exceptions/invalid-media.exception.js';
import { MediaNotFoundException } from '../../domain/exceptions/media-not-found.exception.js';

@Catch(InvalidMediaException, MediaNotFoundException)
export class MediathequeExceptionFilter implements ExceptionFilter {
  catch(
    error: InvalidMediaException | MediaNotFoundException,
    host: ArgumentsHost,
  ) {
    const [statusCode, code] =
      error instanceof MediaNotFoundException
        ? [404, 'MEDIA_NOT_FOUND']
        : [400, 'INVALID_MEDIA'];
    const body: ErrorResponse = { code, message: error.message, details: null };
    host.switchToHttp().getResponse<Response>().status(statusCode).json(body);
  }
}
