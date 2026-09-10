import type { GoogleIdentity } from '../models/google-identity.js';

export interface GoogleTokenVerifierGateway {
  verify(idToken: string): Promise<GoogleIdentity>;
}

export const GOOGLE_TOKEN_VERIFIER = Symbol('GOOGLE_TOKEN_VERIFIER');
