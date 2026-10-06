import type { CreateSuperAdminInput } from '../../application/use-cases/commands/create-super-admin/CreateSuperAdminInput.js';
import { EventEmitterReadinessWatcher } from '@nestjs/event-emitter';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CreateSuperAdminUseCase } from '../../application/use-cases/commands/create-super-admin/CreateSuperAdmin.js';

export class SuperAdminInitializer implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminInitializer.name);

  constructor(
    private readonly createSuperAdminUseCase: CreateSuperAdminUseCase,
    private readonly readiness: EventEmitterReadinessWatcher,
    private readonly input: CreateSuperAdminInput,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Initializing super admin...');
    await this.readiness.waitUntilReady();
    await this.createSuperAdminUseCase.handle(this.input);
    this.logger.log('Super admin initialization completed.');
  }
}
