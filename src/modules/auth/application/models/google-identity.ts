/** Trusted profile obtained from the server-side OAuth exchange or ID-token verifier. */
export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
}
