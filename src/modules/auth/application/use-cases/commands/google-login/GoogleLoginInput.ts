import type { GoogleIdentity } from '../../../models/google-identity.js';
export interface GoogleLoginInput {
  profile: GoogleIdentity;
  userAgent?: string;
}
