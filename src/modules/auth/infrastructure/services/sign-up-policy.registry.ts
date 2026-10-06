import type { SignUpPolicyGateway } from '../../application/gateways/i-sign-up-policy.gateway.js';

export type SignUpRule = (email: string) => Promise<boolean>;

/**
 * Lets a module that depends on auth (school) supply the sign-up rule without
 * auth depending on it. Closed by default: no rule registered, no sign-up.
 */
export class SignUpPolicyRegistry implements SignUpPolicyGateway {
  private rule: SignUpRule | null = null;

  register(rule: SignUpRule): void {
    this.rule = rule;
  }

  canSignUp(email: string): Promise<boolean> {
    return this.rule ? this.rule(email) : Promise.resolve(false);
  }
}
