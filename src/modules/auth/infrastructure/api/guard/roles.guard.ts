import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { GlobalRole } from '../../../../user/domain/enum/global-role.enum.js';
import type { AuthenticatedRequest } from './auth.guard.js';
import { AccessTokenRequiredException } from '../../../domain/exceptions/access-token-required.exception.js';
import { InsufficientRoleException } from '../../../domain/exceptions/insufficient-role.exception.js';

/** Must run after AuthGuard. The error never reveals the user's or the required roles. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<GlobalRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>()
      .auth?.user;
    if (!user) throw new AccessTokenRequiredException();
    if (!requiredRoles.includes(user.globalRole))
      throw new InsufficientRoleException();
    return true;
  }
}
