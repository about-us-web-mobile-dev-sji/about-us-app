import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticateUseCase } from '../../application/use-cases/queries/authenticate/Authenticate.js';
import type { AuthenticateOutput } from '../../application/use-cases/queries/authenticate/AuthenticateOutput.js';
import { accessToken } from './auth-transport.js';

export type AuthenticatedRequest = Request & { auth: AuthenticateOutput };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AuthenticateUseCase)
    private readonly authenticate: AuthenticateUseCase,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    req.auth = await this.authenticate.handle({
      accessToken: accessToken(req),
    });
    return true;
  }
}
