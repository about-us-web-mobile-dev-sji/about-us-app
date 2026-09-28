import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { SpaceException } from '../../domain/exceptions/space.exceptions.js';

@Catch(SpaceException)
export class SpaceExceptionFilter implements ExceptionFilter {
  catch(exception: SpaceException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.BAD_REQUEST;
    let message = exception.message;

    switch (exception.code) {
      case 'SPACE_NOT_FOUND':
        status = HttpStatus.NOT_FOUND;
        break;
      case 'SPACE_PARENT_NOT_FOUND':
        status = HttpStatus.NOT_FOUND;
        break;
      case 'SPACE_ROOT_MOVE_FORBIDDEN':
        status = HttpStatus.FORBIDDEN;
        message = 'Cannot move the school root space';
        break;
      case 'SPACE_ROOT_DELETE_FORBIDDEN':
        status = HttpStatus.FORBIDDEN;
        message = 'Cannot delete the school root space via normal operations';
        break;
      case 'SPACE_CROSS_SCHOOL_MOVE_FORBIDDEN':
        status = HttpStatus.FORBIDDEN;
        message = 'Cannot move space across different schools';
        break;
      case 'SPACE_CYCLE_DETECTED':
        status = HttpStatus.CONFLICT;
        message = 'Operation would create a cycle in the space hierarchy';
        break;
      case 'SPACE_HAS_CHILDREN':
        status = HttpStatus.CONFLICT;
        message = 'Space has children and cannot be deleted';
        break;
      case 'SPACE_ALREADY_ARCHIVED':
        status = HttpStatus.CONFLICT;
        message = 'Space is already archived';
        break;
      case 'SPACE_NOT_ARCHIVED':
        status = HttpStatus.CONFLICT;
        message = 'Space is not archived';
        break;
      case 'SPACE_MEMBER_ALREADY_EXISTS':
        status = HttpStatus.CONFLICT;
        message = 'User is already a member of this space';
        break;
      case 'SPACE_MEMBER_NOT_FOUND':
        status = HttpStatus.NOT_FOUND;
        message = 'Membership not found';
        break;
      case 'SPACE_MANAGER_ALREADY_ASSIGNED':
        status = HttpStatus.CONFLICT;
        message = 'Space already has an active manager';
        break;
      case 'SPACE_MANAGER_NOT_FOUND':
        status = HttpStatus.NOT_FOUND;
        message = 'No active manager found for this space';
        break;
      case 'SPACE_MANAGEMENT_FORBIDDEN':
        status = HttpStatus.FORBIDDEN;
        message = 'User cannot manage this space';
        break;
      case 'SCHOOL_ROOT_ALREADY_EXISTS':
        status = HttpStatus.CONFLICT;
        message = 'School already has a root space';
        break;
      case 'SPACE_INSERT_PARENT_ON_ROOT_FORBIDDEN':
        status = HttpStatus.FORBIDDEN;
        message = 'Cannot insert a parent above the school root';
        break;
      case 'SPACE_DELETED':
        status = HttpStatus.GONE;
        message = 'Space has been deleted';
        break;
      case 'SPACE_INVALID_PARENT':
        status = HttpStatus.BAD_REQUEST;
        break;
      case 'SPACE_PARENT_REQUIRED':
        status = HttpStatus.BAD_REQUEST;
        message = 'Parent space is required for STANDARD spaces';
        break;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.name,
    });
  }
}