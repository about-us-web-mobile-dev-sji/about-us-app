import { UserAccountService } from '../../../user/application/user-account.service.js';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SuperAdminEventsGateway } from '../../../user/application/gateways/i-super-admin-events.gateway.js';
import { CreateSuperAdminIdentityUseCase } from '../../application/use-cases/create-super-admin-identity.usecase.js';

export class SuperAdminCreatedListener
  implements OnModuleInit, OnModuleDestroy
{
  private unsubscribe?: () => void;
  constructor(
    private readonly events: SuperAdminEventsGateway,
    private readonly createIdentity: CreateSuperAdminIdentityUseCase,
    private readonly config: ConfigService,
    private readonly users: UserAccountService,
  ) {}
  onModuleInit(): void {
    // All onModuleInit hooks run before User's onApplicationBootstrap hook.
    this.unsubscribe = this.events.subscribe(async (event) => {
      if (!(await this.users.requiresPasswordAuthentication(event.subjectId)))
        throw new Error('Event subject is not a super admin');
      await this.createIdentity.handle({
        subjectId: event.subjectId,
        email: event.email,
        password: this.config.get<string>('super-admin.password') ?? '',
      });
    });
  }
  onModuleDestroy(): void {
    this.unsubscribe?.();
  }
}
