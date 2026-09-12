import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class InvitationTokenService {
  private readonly TOKEN_LENGTH = 32; // 32 bytes = 256 bits

  /**
   * Generate a cryptographically secure random token
   * Returns the raw token (to be sent in email) and its hash (to be stored)
   */
  generateToken(): { rawToken: string; tokenHash: string } {
    const rawToken = randomBytes(this.TOKEN_LENGTH).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    return { rawToken, tokenHash };
  }

  /**
   * Hash a token using SHA-256
   */
  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Verify if a raw token matches a stored hash
   */
  verifyToken(rawToken: string, tokenHash: string): boolean {
    const computedHash = this.hashToken(rawToken);
    return computedHash === tokenHash;
  }

  /**
   * Calculate expiration date (7 days from now)
   */
  calculateExpirationDate(): Date {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);
    return expirationDate;
  }
}
