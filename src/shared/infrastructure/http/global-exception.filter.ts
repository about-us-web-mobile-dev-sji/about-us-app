import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainException } from '../../domain/exceptions/domain.exception.js';
import type { ErrorResponse } from './error-response.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const error = this.toErrorResponse(exception);

    if (!(exception instanceof DomainException) && !(exception instanceof HttpException)) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(this.getStatus(exception)).json(error);
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof DomainException) return exception.statusCode;
    if (exception instanceof HttpException) return exception.getStatus();
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private toErrorResponse(exception: unknown): ErrorResponse {
    if (exception instanceof DomainException) {
      return {
        code: exception.code,
        message: exception.message,
        details: exception.details ?? null,
      };
    }

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        return { code: 'HTTP_ERROR', message: payload, details: null };
      }

      const messages =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? payload.message
          : null;
      return {
        code: 'HTTP_ERROR',
        message: typeof messages === 'string' ? messages : exception.message,
        details: Array.isArray(messages) ? { messages } : null,
      };
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Une erreur interne est survenue',
      details: null,
    };
  }
}