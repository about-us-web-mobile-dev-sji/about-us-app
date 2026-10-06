import { UnpersistedUserException } from '../../../exceptions/unpersisted-user.exception.js';
import type { CreateSuperAdminInput } from './CreateSuperAdminInput.js';
import type { CreateSuperAdminOutput } from './CreateSuperAdminOutput.js';
import type { UserRepository } from '../../../../domain/repositories/i-user.repository.js';
import { SuperAdminCreatedEvent } from '../../../../domain/events/super-admin-created.event.js';
import type { SuperAdminEventsGateway } from '../../../gateway/super-admin-events.gateway.js';
import { Email } from '../../../../domain/value-objects/email.js';

export class CreateSuperAdminUseCase {
  private pending: Promise<CreateSuperAdminOutput> | undefined;
  constructor(
    private readonly userRepository: UserRepository,
    private readonly events: SuperAdminEventsGateway,
  ) {}
  handle(input: CreateSuperAdminInput): Promise<CreateSuperAdminOutput> {
    if (!this.pending)
      this.pending = this.createAndPublish(input).finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }
  private async createAndPublish(
    input: CreateSuperAdminInput,
  ): Promise<CreateSuperAdminOutput> {
    let user = await this.userRepository.findSuperAdmin();
    if (!user) {
      const email = Email.create(input.email ?? '').value;
      user = await this.userRepository.createInitialSuperAdmin({
        ...input,
        email,
      });
    }
    if (!user.id)
      throw new UnpersistedUserException();
    // Redelivery also repairs an interrupted User → Auth bootstrap.
    await this.events.publish(new SuperAdminCreatedEvent(user.id, user.email));
  }
}
