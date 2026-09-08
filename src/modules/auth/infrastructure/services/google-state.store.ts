import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import type {
  Metadata,
  StateStoreStoreCallback,
  StateStoreVerifyCallback,
} from 'passport-oauth2';

/** Single-process OAuth state store, bound to the initiating browser. */
export class GoogleStateStore {
  private readonly pending = new Map<
    string,
    { browser: string; expiresAt: number }
  >();
  constructor(private readonly secure: boolean) {}
  private readonly cookie = 'google_oauth_state';
  private readonly path = '/auth/google/callback';

  store(
    req: Request,
    callbackOrMeta: StateStoreStoreCallback | Metadata,
    callback?: StateStoreStoreCallback,
  ): void {
    const done =
      typeof callbackOrMeta === 'function' ? callbackOrMeta : callback!;
    for (const [key, value] of this.pending) {
      if (value.expiresAt <= Date.now()) this.pending.delete(key);
    }
    if (this.pending.size >= 10000)
      return done(new Error('Too many pending logins'), undefined);
    if (!req.res) return done(new Error('Missing HTTP response'), undefined);
    const state = randomBytes(32).toString('hex');
    const browser = randomBytes(32).toString('hex');
    this.pending.set(state, { browser, expiresAt: Date.now() + 300000 });
    req.res.cookie(this.cookie, browser, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: this.path,
      maxAge: 300000,
    });
    done(null, state);
  }

  verify(
    req: Request,
    state: string,
    callbackOrMeta: StateStoreVerifyCallback | Metadata,
    callback?: StateStoreVerifyCallback,
  ): void {
    const done =
      typeof callbackOrMeta === 'function' ? callbackOrMeta : callback!;
    const entry = this.pending.get(state);
    const browser = req.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(this.cookie + '='))
      ?.slice(this.cookie.length + 1);
    const valid =
      !!entry && entry.expiresAt > Date.now() && browser === entry.browser;
    if (valid || (entry && entry.expiresAt <= Date.now()))
      this.pending.delete(state);
    req.res?.clearCookie(this.cookie, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: this.path,
    });
    done(
      null,
      valid,
      valid ? undefined : { message: 'Invalid or expired OAuth state' },
    );
  }
}
