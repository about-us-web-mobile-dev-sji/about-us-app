import type { ChangePasswordInput } from './change-password.input.js';
import type { ChangePasswordOutput } from './change-password.output.js';
import type { AccessTokenGateway } from '../../../gateways/i-access-token.gateway.js';
import type { AuthSubjectGateway } from '../../../gateways/i-auth-subject.gateway.js';
import type { PasswordEncryptionGateway } from '../../../gateways/i-password-encryption.gateway.js';
import type { PasswordChangeGateway } from '../../../gateways/i-password-change.gateway.js';
import type { SessionValidator } from '../../../services/session-validator.service.js';
import type { AuthIdentityRepository } from '../../../../domain/repositories/auth-identity.repositories.js';
import { AuthProvider } from '../../../../domain/enums/auth-provider.enums.js';
import { InvalidCredentialsException } from '../../../../domain/exceptions/invalid-credentials.exception.js';
import { InvalidPasswordException } from '../../../../domain/exceptions/invalid-password.exception.js';
import { PasswordChangeForbiddenException } from '../../../../domain/exceptions/password-change-forbidden.exception.js';

export class ChangePassword {
  constructor(
    private readonly access: AccessTokenGateway,
    private readonly validator: SessionValidator,
    private readonly subjects: AuthSubjectGateway,
    private readonly identities: AuthIdentityRepository,
    private readonly passwords: PasswordEncryptionGateway,
    private readonly changes: PasswordChangeGateway,
  ) {}

  async handle(input: ChangePasswordInput): Promise<ChangePasswordOutput> {
    const claims = await this.access.verify(input.accessToken);
    await this.validator.validate(claims);
    if (!(await this.subjects.canChangePassword(claims.sub)))
      throw new PasswordChangeForbiddenException();
    if (
      typeof input.currentPassword !== 'string' ||
      !input.currentPassword ||
      new TextEncoder().encode(input.currentPassword).length > 72
    )
      throw new InvalidCredentialsException();
    if (
      typeof input.newPassword !== 'string' ||
      Array.from(input.newPassword).length < 12 ||
      !input.newPassword.trim() ||
      new TextEncoder().encode(input.newPassword).length > 72
    )
      throw new InvalidPasswordException();
    const identity = await this.identities.findBySubjectAndProvider(
      claims.sub,
      AuthProvider.EMAIL,
    );
    const hash = identity?.toPrimitives().passwordHash;
    if (
      !identity ||
      !hash ||
      !(await this.passwords.compare(input.currentPassword, hash))
    )
      throw new InvalidCredentialsException();
    if (await this.passwords.compare(input.newPassword, hash))
      throw new InvalidPasswordException(
        'New password must differ from the current password',
      );
    const passwordHash = await this.passwords.encrypt(input.newPassword);
    await this.changes.change({
      identityId: identity.id,
      subjectId: claims.sub,
      expectedHash: hash,
      passwordHash,
    });
  }
}
