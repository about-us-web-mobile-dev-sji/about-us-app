/** Profile obtained server-side by Passport after exchanging the OAuth code. */
export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
}
