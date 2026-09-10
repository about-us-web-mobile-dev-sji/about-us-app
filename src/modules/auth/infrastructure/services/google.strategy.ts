import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Strategy, type Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import type { GoogleIdentity } from '../../application/models/google-identity.js';
import { GoogleStateStore } from './google-state.store.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('google.clientId'),
      clientSecret: config.getOrThrow<string>('google.clientSecret'),
      callbackURL: config.getOrThrow<string>('google.callbackUrl'),
      scope: ['openid', 'email', 'profile'],
      state: true,
      store: new GoogleStateStore(config.get('NODE_ENV') === 'production'),
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): GoogleIdentity {
    const email = profile.emails?.find(
      (value) => value.verified === true,
    )?.value;
    if (profile.provider !== 'google' || !profile.id || !email) {
      throw new UnauthorizedException('Google must provide a verified email');
    }
    return {
      sub: profile.id,
      email: email.trim().toLowerCase(),
      emailVerified: true,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };
  }
}
