import type { AuthSubjectGateway } from '../../application/gateways/i-auth-subject.gateway.js';
import { UserAccountService } from '../../../user/application/user-account.service.js';
export class UserAuthSubjectGateway implements AuthSubjectGateway {
  constructor(private readonly users: UserAccountService) {}
  authenticationProfile(id: string) {
    return this.users.authenticationProfile(id);
  }
  async canAuthenticateWithGoogle(id: string) {
    return (
      (await this.users.canAuthenticate(id)) &&
      !(await this.users.requiresPasswordAuthentication(id))
    );
  }
  exists(id: string) {
    return this.users.exists(id);
  }
  canAuthenticate(id: string) {
    return this.users.canAuthenticate(id);
  }
  create(input: { email: string; firstName?: string; lastName?: string }) {
    return this.users.create(input);
  }
}
