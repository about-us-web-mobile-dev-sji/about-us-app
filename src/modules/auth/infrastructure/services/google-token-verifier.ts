import { InvalidGoogleIdentityException } from '../../domain/exceptions/invalid-google-identity.exception.js';
import { OAuth2Client } from 'google-auth-library';
import type { GoogleIdentity } from '../../application/models/google-identity.js';
import type { GoogleTokenVerifierGateway } from '../../application/gateways/i-google-token-verifier.gateway.js';
export class GoogleTokenVerifier implements GoogleTokenVerifierGateway {
  private readonly client = new OAuth2Client();
  constructor(private readonly audiences: string[]) {
    if (!audiences.length) throw new Error('Google audience is required');
  }
  async verify(idToken: string): Promise<GoogleIdentity> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audiences,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true)
        throw new Error('Unverified Google identity');
      return {
        sub: payload.sub,
        email: payload.email.trim().toLowerCase(),
        emailVerified: true,
        firstName: payload.given_name,
        lastName: payload.family_name,
      };
    } catch {
      throw new InvalidGoogleIdentityException();
    }
  }
}
