import type { UserRepository } from '../../../domain/repositories/i-user.repository.js';
import { SuperAdminCreatedEvent } from '../../../domain/events/super-admin-created.event.js';
import type { SuperAdminEventsGateway } from '../../gateways/i-super-admin-events.gateway.js';

export class CreateSuperAdminUseCase {
  private pending: Promise<void> | undefined;
  constructor(
    private readonly options: {
      email?: string;
      firstName?: string;
      lastName?: string;
    },
    private readonly userRepository: UserRepository,
    private readonly events: SuperAdminEventsGateway,
  ) {}
  handle(): Promise<void> {
    if (!this.pending)
      this.pending = this.createAndPublish().finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }
  private async createAndPublish(): Promise<void> {
    let user = await this.userRepository.findSuperAdmin();
    if (!user) {
      const email = this.options.email?.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('SUPER_ADMIN_EMAIL must be configured');
      user = await this.userRepository.createInitialSuperAdmin({
        ...this.options,
        email,
      });
    }
    if (!user.id)
      throw new Error(
        'Super admin must be persisted before publishing its creation',
      );
    // Redelivery also repairs an interrupted User → Auth bootstrap.
    await this.events.publish(new SuperAdminCreatedEvent(user.id, user.email));
  }
}
