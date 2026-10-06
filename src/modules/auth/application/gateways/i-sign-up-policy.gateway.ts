export const SIGN_UP_POLICY = Symbol('SIGN_UP_POLICY');

/** Decides whether an unknown identity may create an account. */
export interface SignUpPolicyGateway {
  canSignUp(email: string): Promise<boolean>;
}
