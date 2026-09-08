import { AuthIdentity } from '../../domain/entities/auth-identity.js';
import { AuthProvider } from '../../domain/enums/auth-provider.enums.js';
import type { AuthIdentityRepository } from '../../domain/repositories/auth-identity.repositories.js';
import type { PasswordEncryptionGateway } from '../gateways/i-password-encryption.gateway.js';

export class CreateSuperAdminIdentityUseCase {
  private pending: Promise<void> = Promise.resolve();
  constructor(
    private readonly identities: AuthIdentityRepository,
    private readonly passwords: PasswordEncryptionGateway,
  ) {}
  handle(input: {
    subjectId: string;
    email: string;
    password: string;
  }): Promise<void> {
    const task = this.pending.then(() => this.create(input));
    this.pending = task.catch(() => undefined);
    return task;
  }
  private async create(input: {
    subjectId: string;
    email: string;
    password: string;
  }): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const existing =
      (await this.identities.findBySubjectAndProvider(
        input.subjectId,
        AuthProvider.EMAIL,
      )) ?? (await this.identities.findByProvider(AuthProvider.EMAIL, email));
    if (existing) {
      if (existing.subjectId !== input.subjectId)
        throw new Error('Super admin email belongs to another identity');
      return; // A bootstrap retry must not reset a persisted password.
    }
    if (
      !input.password?.trim() ||
      new TextEncoder().encode(input.password).length > 72
    ) {
      throw new Error(
        'SUPER_ADMIN_PASSWORD must be configured and contain at most 72 UTF-8 bytes',
      );
    }
    const passwordHash = await this.passwords.encrypt(input.password);
    await this.identities.createIfAbsent(
      AuthIdentity.prepareCreation({
        subjectId: input.subjectId,
        provider: AuthProvider.EMAIL,
        providerSubject: email,
        passwordHash,
      }),
    );
  }
}
