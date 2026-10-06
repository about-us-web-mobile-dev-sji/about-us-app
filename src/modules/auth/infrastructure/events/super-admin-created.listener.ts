import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserAccountService } from '../../../user/application/user-account.service.js';
import { ConfigService } from '@nestjs/config';
import { CreateSuperAdminIdentityUseCase } from '../../application/use-cases/commands/create-super-admin-identity/CreateSuperAdminIdentity.js';

@Injectable()
export class SuperAdminCreatedListener {
  constructor(
    private readonly createIdentity: CreateSuperAdminIdentityUseCase,
    private readonly config: ConfigService,
    private readonly users: UserAccountService,
  ) {}

  @OnEvent('super-admin.created', { suppressErrors: false })
  async handle(event: { subjectId: string; email: string }) {
    if (!(await this.users.requiresPasswordAuthentication(event.subjectId)))
      throw new Error('Event subject is not a super admin');
    await this.createIdentity.handle({
      subjectId: event.subjectId,
      email: event.email,
      password: this.config.get<string>('super-admin.password') ?? '',
    });
  }
}
